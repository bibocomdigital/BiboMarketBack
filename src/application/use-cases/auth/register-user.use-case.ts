import { randomBytes } from 'node:crypto';
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

export interface RegisterUserInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
  email?: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(input: RegisterUserInput) {
    const { firstName, lastName, phoneNumber, password, role, email } = input;

    const existingPhoneUser = await this.users.findByPhoneNumber(
      phoneNumber as string,
    );

    if (existingPhoneUser) {
      throw new ExpressContractException(
        400,
        'Ce numéro de téléphone existe déjà.',
        'PHONE_EXISTS',
      );
    }

    if (email) {
      const existingEmailUser = await this.users.findByEmail(email);
      if (existingEmailUser) {
        throw new ExpressContractException(
          400,
          'Cet email existe déjà.',
          'EMAIL_EXISTS',
        );
      }
    }

    const hashedPassword = await this.passwordHasher.hash(password as string);
    const userRole = role ?? 'CLIENT';

    let profileCompletion = 25;
    const onboardingStep = 'personal_info';

    if (firstName && lastName) profileCompletion += 25;
    if (phoneNumber) profileCompletion += 25;
    if (email) profileCompletion += 25;

    const newUser = await this.users.create({
      firstName,
      lastName,
      phoneNumber,
      email,
      password: hashedPassword,
      role: userRole,
      isVerified: true,
      onboardingStep,
      profileCompletion,
      isProfileCompleted: false,
    });

    return {
      status: 'success',
      message: 'Inscription réussie. Vous pouvez maintenant vous connecter.',
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        email: newUser.email,
        role: newUser.role,
      },
      onboarding: {
        step: onboardingStep,
        progress: profileCompletion,
      },
    };
  }
}

export function generateVerificationCode(): string {
  return randomBytes(3).toString('hex');
}
