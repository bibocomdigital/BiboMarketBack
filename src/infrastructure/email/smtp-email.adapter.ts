import { Injectable } from '@nestjs/common';
import type { EmailServicePort } from '@application/ports/output/email-service.port';

@Injectable()
export class SmtpEmailAdapter implements EmailServicePort {
  async sendPasswordReset(_email: string, _resetCode: string): Promise<void> {
    throw new Error('Email provider is not configured');
  }

  async sendWelcome(_email: string, _firstName: string): Promise<void> {
    throw new Error('Email provider is not configured');
  }

  async sendContactMerchant(): Promise<void> {
    throw new Error('Email provider is not configured');
  }

  async sendContactConfirmation(): Promise<void> {
    throw new Error('Email provider is not configured');
  }

  async sendContactResponse(): Promise<void> {
    throw new Error('Email provider is not configured');
  }
}
