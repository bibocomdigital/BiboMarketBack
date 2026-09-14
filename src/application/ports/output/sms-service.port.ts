export const SMS_SERVICE = Symbol('SMS_SERVICE');

export interface SmsServicePort {
  sendRaw(phoneNumber: string, message: string): Promise<void>;
  sendCongratulation(phoneNumber: string, firstName: string): Promise<void>;
}
