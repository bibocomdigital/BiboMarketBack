import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import { verifyOtpCode } from '@application/utils/otp.util';

@Injectable()
export class VerifyPhoneUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: number, code: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ExpressContractException(
        404,
        'Utilisateur non trouvé',
        'USER_NOT_FOUND',
      );
    }

    if (user.phoneVerified) {
      throw new ExpressContractException(
        400,
        'Votre numéro de téléphone est déjà vérifié',
        'PHONE_ALREADY_VERIFIED',
      );
    }

    if (!user.phoneVerificationCode || !user.phoneVerificationExpiry) {
      throw new ExpressContractException(
        400,
        'Aucun code en attente. Veuillez demander un nouveau code.',
        'NO_OTP_REQUESTED',
      );
    }

    if (user.phoneVerificationExpiry.getTime() < Date.now()) {
      throw new ExpressContractException(
        401,
        'Code expiré. Veuillez demander un nouveau code.',
        'OTP_EXPIRED',
      );
    }

    const isCodeValid = await verifyOtpCode(code, user.phoneVerificationCode);
    if (!isCodeValid) {
      throw new ExpressContractException(
        401,
        'Code incorrect. Veuillez réessayer.',
        'OTP_INVALID',
      );
    }

    await this.users.update(userId, {
      phoneVerified: true,
      phoneVerificationCode: null,
      phoneVerificationExpiry: null,
    });

    return {
      status: 'success',
      message: 'Numéro de téléphone vérifié avec succès.',
      phoneNumber: user.phoneNumber,
      phoneVerified: true,
    };
  }
}
