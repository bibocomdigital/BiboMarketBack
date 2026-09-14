import { Inject, Injectable } from '@nestjs/common';
import { NODE_ENV } from '@application/config/env';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  EMAIL_SERVICE,
  type EmailServicePort,
} from '@application/ports/output/email-service.port';
import {
  SMS_SERVICE,
  type SmsServicePort,
} from '@application/ports/output/sms-service.port';
import { generateVerificationCode } from './register-user.use-case';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailServicePort,
    @Inject(SMS_SERVICE) private readonly smsService: SmsServicePort,
  ) {}

  async execute(input: { phoneNumber?: string; email?: string }) {
    const { phoneNumber, email } = input;

    if (phoneNumber && email) {
      throw new ExpressContractException(
        400,
        'Veuillez fournir soit un numéro de téléphone, soit une adresse email',
        'INVALID_IDENTIFIER',
      );
    }

    if (!phoneNumber && !email) {
      throw new ExpressContractException(
        400,
        'Veuillez fournir soit un numéro de téléphone, soit une adresse email',
        'INVALID_IDENTIFIER',
      );
    }

    const user = phoneNumber
      ? await this.users.findByPhoneNumber(phoneNumber)
      : await this.users.findByEmail(email as string);

    if (!user) {
      throw new ExpressContractException(
        404,
        "Aucun compte associé à cette adresse email n'a été trouvé",
        'USER_NOT_FOUND',
      );
    }

    const resetCode = generateVerificationCode();
    const tokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await this.users.update(user.id, { resetCode, tokenExpiry });

    if (email && user.email) {
      try {
        await this.emailService.sendPasswordReset(user.email, resetCode);
        return {
          status: 'success',
          message:
            'Un code de réinitialisation a été envoyé à votre adresse email.',
          email: user.email,
        };
      } catch {
        if (NODE_ENV !== 'production') {
          return {
            status: 'partial_success',
            message:
              "Un code de réinitialisation a été généré mais l'email n'a pas pu être envoyé. Code de test:",
            email: user.email,
            testResetCode: resetCode,
          };
        }
        throw new ExpressContractException(
          500,
          "Échec de l'envoi de l'email",
          'EMAIL_FAILED',
        );
      }
    }

    try {
      await this.smsService.sendRaw(
        user.phoneNumber as string,
        `Votre code de réinitialisation : ${resetCode}`,
      );
      return {
        status: 'success',
        message: 'Un code de réinitialisation a été envoyé par SMS.',
        phoneNumber: user.phoneNumber,
      };
    } catch {
      if (NODE_ENV !== 'production') {
        return {
          status: 'partial_success',
          message:
            "Un code de réinitialisation a été généré mais le SMS n'a pas pu être envoyé. Code de test:",
          phoneNumber: user.phoneNumber,
          testResetCode: resetCode,
        };
      }
      throw new ExpressContractException(
        500,
        "Erreur lors de l'envoi du SMS",
        'SMS_FAILED',
      );
    }
  }
}
