import type { SmsServicePort } from '@application/ports/output/sms-service.port';
import type { SmsGatewayPort } from '@application/ports/output/sms-gateway.port';
import { SMS_PROVIDER, SMS_SENDER_ID } from '@application/config/env';
import { ConsoleSmsGateway } from '@infrastructure/sms/console-sms.gateway';
import { HttpSmsGateway } from '@infrastructure/sms/http-sms.gateway';
import { OrangeSmsGateway } from '@infrastructure/sms/orange-sms.gateway';

/** Sélectionne la passerelle SMS selon `SMS_PROVIDER` (défaut : console). */
export function createSmsGateway(): SmsGatewayPort {
  switch (SMS_PROVIDER) {
    case 'orange':
      return new OrangeSmsGateway();
    case 'http':
      return new HttpSmsGateway();
    default:
      return new ConsoleSmsGateway();
  }
}

export class SmsAdapter implements SmsServicePort {
  private readonly gateway: SmsGatewayPort;

  constructor(gateway: SmsGatewayPort = createSmsGateway()) {
    this.gateway = gateway;
  }

  async sendRaw(phoneNumber: string, message: string): Promise<void> {
    await this.gateway.send({
      telephone: phoneNumber,
      message,
      sender: SMS_SENDER_ID,
    });
  }

  async sendCongratulation(
    phoneNumber: string,
    firstName: string,
  ): Promise<void> {
    await this.gateway.send({
      telephone: phoneNumber,
      message: `Félicitations ${firstName} ! Votre compte a été créé avec succès.`,
      sender: SMS_SENDER_ID,
    });
  }
}
