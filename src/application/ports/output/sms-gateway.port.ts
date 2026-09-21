export interface SmsMessage {
  telephone: string;
  message: string;
  sender?: string;
}

export interface SmsGatewayPort {
  send(payload: SmsMessage): Promise<void>;
}
