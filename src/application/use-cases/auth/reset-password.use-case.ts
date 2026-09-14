import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '@application/ports/output/password-hasher.port';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(input: {
    phone?: string;
    email?: string;
    resetCode?: string;
    newPassword?: string;
  }) {
    const { phone, email, resetCode, newPassword } = input;

    const user = await this.users.findFirstByPhoneOrEmail({ phone, email });

    if (!user) {
      throw new ExpressContractException(
        404,
        'Utilisateur introuvable',
        'USER_NOT_FOUND',
      );
    }

    if (!user.tokenExpiry || new Date() > user.tokenExpiry) {
      throw new ExpressContractException(
        400,
        'Le code de réinitialisation a expiré',
        'RESET_CODE_EXPIRED',
      );
    }

    if (user.resetCode !== resetCode) {
      throw new ExpressContractException(
        400,
        'Le code de réinitialisation est incorrect',
        'RESET_CODE_INCORRECT',
      );
    }

    const hashedPassword = await this.passwordHasher.hash(newPassword as string);

    await this.users.update(user.id, {
      password: hashedPassword,
      resetCode: null,
      tokenExpiry: null,
    });

    return {
      status: 'success',
      message: 'Mot de passe réinitialisé avec succès',
    };
  }
}
