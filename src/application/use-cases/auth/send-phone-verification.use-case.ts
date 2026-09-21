import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  SMS_SERVICE,
  type SmsServicePort,
} from '@application/ports/output/sms-service.port';
import {
  OTP_EXPIRY_MS,
  generateOtpCode,
  getOtpExpiryDate,
  hashOtpCode,
} from '@application/utils/otp.util';
import { NODE_ENV } from '@application/config/env';

const RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class SendPhoneVerificationCodeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SMS_SERVICE) private readonly smsService: SmsServicePort,
  ) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ExpressContractException(
        404,
        'Utilisateur non trouvé',
        'USER_NOT_FOUND',
      );
    }

    if (user.role === 'ADMIN') {
      throw new ExpressContractException(
        403,
        'La vérification du numéro ne concerne pas les comptes administrateur',
        'PHONE_VERIFICATION_NOT_REQUIRED',
      );
    }

    if (user.phoneVerified) {
      throw new ExpressContractException(
        400,
        'Votre numéro de téléphone est déjà vérifié',
        'PHONE_ALREADY_VERIFIED',
      );
    }

    if (!user.phoneNumber) {
      throw new ExpressContractException(
        400,
        'Aucun numéro de téléphone associé à ce compte',
        'PHONE_MISSING',
      );
    }

    // Anti-abus : minimum 60 s entre deux envois
    if (user.phoneVerificationCode && user.phoneVerificationExpiry) {
      const lastSentAt = user.phoneVerificationExpiry.getTime() - OTP_EXPIRY_MS;
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
    const expiresAt = getOtpExpiryDate();

    await this.users.update(userId, {
      phoneVerificationCode: hashedCode,
      phoneVerificationExpiry: expiresAt,
    });

    try {
      await this.smsService.sendRaw(
        user.phoneNumber,
        `Bibomarket : votre code de vérification est ${code}. Valable 10 minutes.`,
      );
    } catch {
      if (NODE_ENV !== 'production') {
        return {
          status: 'partial_success',
          message:
            "Un code a été généré mais le SMS n'a pas pu être envoyé. Code de test :",
          phoneNumber: user.phoneNumber,
          testCode: code,
          expiresAt,
        };
      }
      throw new ExpressContractException(
        500,
        "Erreur lors de l'envoi du SMS",
        'SMS_FAILED',
      );
    }

    return {
      status: 'success',
      message: 'Un code de vérification a été envoyé par SMS.',
      phoneNumber: user.phoneNumber,
      expiresAt,
    };
  }
}
