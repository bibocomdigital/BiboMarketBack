import { Inject, Injectable } from '@nestjs/common';
import {
  calculateProfileCompletion,
  getNextOnboardingStep,
} from '@domain/onboarding/profile-completion';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import { Role } from '@domain/types/role';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';
import {
  SMS_SERVICE,
  type SmsServicePort,
} from '@application/ports/output/sms-service.port';

@Injectable()
export class VerifyRegistrationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
    @Inject(SMS_SERVICE) private readonly smsService: SmsServicePort,
  ) {}

  async execute(input: { email?: string; verificationCode?: string }) {
    const { email, verificationCode } = input;

    if (!email) {
      throw new ExpressContractException(
        400,
        'Email requis pour la vérification',
        'EMAIL_REQUIRED',
      );
    }

    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new ExpressContractException(
        404,
        "Aucun compte associé à cette adresse email n'a été trouvé",
        'USER_NOT_FOUND',
      );
    }

    if (user.tokenExpiry && new Date() > user.tokenExpiry) {
      throw new ExpressContractException(
        400,
        'Code de vérification expiré. Veuillez demander un nouveau code',
        'CODE_EXPIRED',
      );
    }

    if (user.verificationCode !== verificationCode) {
      throw new ExpressContractException(
        400,
        'Code de vérification incorrect',
        'INCORRECT_CODE',
      );
    }

    const nextStep = getNextOnboardingStep(user);
    const profileCompletion = calculateProfileCompletion(user);
    const isProfileComplete = nextStep === 'completed';

    const updatedUser = await this.users.updateByEmail(email, {
      isVerified: true,
      verificationCode: null,
      tokenExpiry: null,
      onboardingStep: isProfileComplete ? 'completed' : nextStep,
      profileCompletion,
      isProfileCompleted: isProfileComplete,
    });

    const tokens = await this.jwtService.generateToken({
      id: updatedUser.id,
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role as Role,
    });

    try {
      if (updatedUser.phoneNumber) {
        await this.smsService.sendCongratulation(
          updatedUser.phoneNumber,
          updatedUser.firstName || 'Nouvel utilisateur',
        );
      }
    } catch {
      // identique à Express : l'échec SMS n'empêche pas la vérification
    }

    return {
      status: 'success',
      message: 'Email vérifié avec succès !',
      token: tokens.access,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        phoneNumber: updatedUser.phoneNumber,
        isVerified: true,
      },
      onboarding: {
        isRequired: !isProfileComplete,
        nextStep,
        progress: profileCompletion,
        completed: isProfileComplete,
        message: isProfileComplete
          ? 'Profil complètement configuré !'
          : 'Complétez votre profil pour une meilleure expérience',
      },
    };
  }
}
