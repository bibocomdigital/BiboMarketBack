export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface EmailServicePort {
  sendPasswordReset(email: string, resetCode: string): Promise<void>;
  sendWelcome(email: string, firstName: string): Promise<void>;
  sendContactMerchant(
    merchantEmail: string,
    subject: string,
    customerEmail: string,
    customerMessage: string,
    shopName: string,
  ): Promise<void>;
  sendContactConfirmation(
    customerEmail: string,
    subject: string,
    shopName: string,
    merchantFirstName: string,
  ): Promise<void>;
  sendContactResponse(
    customerEmail: string,
    subject: string,
    response: string,
    shopName: string,
  ): Promise<void>;
}
