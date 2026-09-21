import {
  SmsGatewayPort,
  SmsMessage,
} from '@application/ports/output/sms-gateway.port';

export class ConsoleSmsGateway implements SmsGatewayPort {
  async send(payload: SmsMessage): Promise<void> {
    console.log(
      `[SMS] To ${payload.telephone} (from ${payload.sender ?? 'N/A'}): ${payload.message}`,
    );
  }
}
