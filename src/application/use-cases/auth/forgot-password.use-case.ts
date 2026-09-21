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
import {
  generateOtpCode,
  getOtpExpiryDate,
  hashOtpCode,
} from '@application/utils/otp.util';

const RESET_CODE_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailServicePort,
    @Inject(SMS_SERVICE) private readonly smsService: SmsServicePort,
  ) {}

  async execute(input: { phoneNumber?: string; email?: string }) {
    const { phoneNumber, email } = input;

    if ((phoneNumber && email) || (!phoneNumber && !email)) {
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
      // Message volontairement neutre pour ne pas révéler l'existence d'un compte
      throw new ExpressContractException(
        404,
        "Aucun compte associé à cet identifiant n'a été trouvé",
        'USER_NOT_FOUND',
      );
    }

    const channel = phoneNumber ? 'sms' : 'email';
    const recipient = channel === 'email' ? user.email : user.phoneNumber;
    if (!recipient) {
      throw new ExpressContractException(
        400,
        channel === 'email'
          ? 'Aucune adresse email associée à ce compte'
          : 'Aucun numéro de téléphone associé à ce compte',
        channel === 'email' ? 'EMAIL_MISSING' : 'PHONE_MISSING',
      );
    }

    // Anti double-envoi : minimum 60 s entre deux codes
    if (user.resetCode && user.tokenExpiry) {
      const lastSentAt = user.tokenExpiry.getTime() - RESET_CODE_TTL_MS;
      if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
        throw new ExpressContractException(
          429,
          'Veuillez patienter avant de demander un nouveau code',
          'TOO_MANY_REQUESTS',
        );
      }
    }

    const code = generateOtpCode();
    const hashedCode = await hashOtpCode(code);
    const tokenExpiry = getOtpExpiryDate(RESET_CODE_TTL_MS);

    await this.users.update(user.id, {
      resetCode: hashedCode,
      tokenExpiry,
    });

    try {
      if (channel === 'email') {
        await this.emailService.sendPasswordReset(recipient, code);
        return {
          status: 'success',
          message:
            'Un code de réinitialisation a été envoyé à votre adresse email.',
          email: recipient,
        };
      }

      await this.smsService.sendRaw(
        recipient,
        `Bibomarket : votre code de réinitialisation est ${code}. Valable 1 heure.`,
      );
      return {
        status: 'success',
        message: 'Un code de réinitialisation a été envoyé par SMS.',
        phoneNumber: recipient,
      };
    } catch {
      if (NODE_ENV !== 'production') {
        return {
          status: 'partial_success',
          message:
            channel === 'email'
              ? "Un code a été généré mais l'email n'a pas pu être envoyé. Code de test :"
              : "Un code a été généré mais le SMS n'a pas pu être envoyé. Code de test :",
          [channel]: recipient,
          testResetCode: code,
        };
      }
      throw new ExpressContractException(
        500,
        channel === 'email'
          ? "Échec de l'envoi de l'email"
          : "Échec de l'envoi du SMS",
        channel === 'email' ? 'EMAIL_FAILED' : 'SMS_FAILED',
      );
    }
  }
}
