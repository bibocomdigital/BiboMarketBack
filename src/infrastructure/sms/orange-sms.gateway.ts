import {
  ORANGE_SENDER_NAME,
  ORANGE_SENDER_NUMBER,
  ORANGE_SMS_BASE_URL,
} from '@application/config/env';
import {
  SmsGatewayPort,
  SmsMessage,
} from '@application/ports/output/sms-gateway.port';
import { ErrorCode } from '@domain/enums/error-code.enum';
import { AppException } from '@domain/exceptions/app.exception';
import { OrangeAuthService } from '@infrastructure/sms/orange-auth.service';

interface OrangeSmsRequestBody {
  outboundSMSMessageRequest: {
    address: string;
    senderAddress: string;
    senderName?: string;
    outboundSMSTextMessage: {
      message: string;
    };
  };
}

export class OrangeSmsGateway implements SmsGatewayPort {
  constructor(
    private readonly orangeAuthService: OrangeAuthService = new OrangeAuthService(),
  ) {}

  async send(payload: SmsMessage): Promise<void> {
    if (!ORANGE_SENDER_NUMBER) {
      throw AppException.create(
        ErrorCode.CONFIGURATION_ERROR,
        'ORANGE_SENDER_NUMBER est requis (ex: 2210000 pour le Sénégal)',
      );
    }

    const accessToken = await this.orangeAuthService.getAccessToken();
    const senderAddress = this.toTelAddress(ORANGE_SENDER_NUMBER);
    const recipientAddress = this.toTelAddress(payload.telephone);
    const endpoint = this.buildSendEndpoint(senderAddress);

    const body: OrangeSmsRequestBody = {
      outboundSMSMessageRequest: {
        address: recipientAddress,
        senderAddress,
        outboundSMSTextMessage: {
          message: payload.message,
        },
      },
    };

    // Ne pas utiliser SMS_SENDER_ID (ex. Bibocomdigital) : Orange refuse
    // les senderName non whitelistés. N'envoyer senderName que s'il est
    // explicitement approuvé via ORANGE_SENDER_NAME.
    if (ORANGE_SENDER_NAME?.trim()) {
      body.outboundSMSMessageRequest.senderName = ORANGE_SENDER_NAME.trim();
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Orange SMS API error:', errorBody);
      throw AppException.create(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        "Échec de l'envoi du SMS via Orange",
      );
    }
  }

  private buildSendEndpoint(senderAddress: string): string {
    const baseUrl =
      ORANGE_SMS_BASE_URL ?? 'https://api.orange.com/smsmessaging/v1';
    const encodedSender = encodeURIComponent(senderAddress);

    return `${baseUrl}/outbound/${encodedSender}/requests`;
  }

  private toTelAddress(phone: string): string {
    if (phone.startsWith('tel:')) {
      return phone;
    }

    const digits = phone.replace(/\D/g, '');
    return `tel:+${digits}`;
  }
}
