import { Injectable } from '@nestjs/common';
import type { SmsServicePort } from '@application/ports/output/sms-service.port';
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
} from '@application/config/env';

@Injectable()
export class TwilioSmsAdapter implements SmsServicePort {
  async sendRaw(phoneNumber: string, message: string): Promise<void> {
    await this.send(phoneNumber, message);
  }

  async sendCongratulation(phoneNumber: string, firstName: string): Promise<void> {
    await this.send(
      phoneNumber,
      `Félicitations ${firstName} ! Votre compte a été créé avec succès.`,
    );
  }

  private async send(to: string, body: string): Promise<void> {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('SMS provider is not configured');
    }

    const credentials = Buffer.from(
      `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
    ).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: to,
          Body: body,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`SMS send failed: ${response.status}`);
    }
  }
}
