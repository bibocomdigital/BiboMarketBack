import { Inject, Injectable } from '@nestjs/common';
import {
  calculateProfileCompletion,
  determineOnboardingStep,
  getNextOnboardingStep,
} from '@domain/onboarding/profile-completion';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '@application/ports/output/password-hasher.port';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';
import { Role } from '@domain/types/role';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
  ) {}

  async execute(input: {
    phoneNumber?: string;
    email?: string;
    password?: string;
  }) {
    const { phoneNumber, email, password } = input;

    const user = await this.users.findFirstByPhoneOrEmail({
      phoneNumber,
      email,
    });

    if (!user) {
      throw new ExpressContractException(
        401,
        phoneNumber ? 'Numéro incorrect' : 'Email incorrecte',
        'INVALID_CREDENTIALS',
      );
    }

    const passwordMatch = await this.passwordHasher.compare(
      password as string,
      user.password,
    );
    if (!passwordMatch) {
      throw new ExpressContractException(
        401,
        'Mot de passe incorrect',
        'INVALID_CREDENTIALS_PWD',
      );
    }

    await this.users.update(user.id, {
      lastLogin: new Date(),
      lastActive: new Date(),
      isOnline: true,
    });

    const tokens = await this.jwtService.generateToken({
      id: user.id,
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role as Role,
    });

    const profileCompletion = calculateProfileCompletion(user);
    const nextStep = getNextOnboardingStep(user);
    const currentStep = determineOnboardingStep(user);
    const isOnboardingRequired = nextStep !== 'completed';

    return {
      status: 'success',
      message: 'Connexion réussie',
      token: tokens.access,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email || null,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        role: user.role,
        country: user.country,
        city: user.city,
        phoneVerified: user.phoneVerified,
        googleId: user.googleId ?? null,
        profileCompletion,
      },
      onboarding: {
        isRequired: isOnboardingRequired,
        currentStep,
        nextStep,
        progress: profileCompletion,
        completed: !isOnboardingRequired,
        steps: {
          personal_info: !!(user.firstName && user.lastName),
          contact_info: !!user.phoneNumber,
          address_info: !!(user.country && user.city),
          profile_photo: !!user.photo,
        },
      },
    };
  }
}
