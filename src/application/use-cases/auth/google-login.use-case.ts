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
import type { User } from '@domain/entities/user.entity';
import { Role } from '@domain/types/role';
import {
  GOOGLE_OAUTH,
  type GoogleOAuthPort,
  type GoogleProfile,
} from '@application/ports/output/google-oauth.port';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';

export function needsProfileCompletion(user: {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
}): boolean {
  const phone = user.phoneNumber?.trim() ?? '';
  return (
    !user.firstName?.trim() ||
    !user.lastName?.trim() ||
    !phone ||
    phone.startsWith('temp-')
  );
}

@Injectable()
export class HandleGoogleLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(GOOGLE_OAUTH) private readonly google: GoogleOAuthPort,
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
  ) {}

  async execute(input: { idToken?: string }) {
    const idToken = input.idToken?.trim();
    if (!idToken) {
      throw new ExpressContractException(
        400,
        'Jeton Google manquant',
        'GOOGLE_TOKEN_MISSING',
      );
    }

    let profile: GoogleProfile;
    try {
      profile = await this.google.verifyIdToken(idToken);
    } catch {
      throw new ExpressContractException(
        401,
        "Jeton Google invalide ou expiré",
        'GOOGLE_TOKEN_INVALID',
      );
    }

    const email = profile.emails?.[0]?.value?.trim();
    if (!email || !profile.emailVerified) {
      throw new ExpressContractException(
        401,
        'Un email Google vérifié est obligatoire',
        'GOOGLE_EMAIL_UNVERIFIED',
      );
    }

    const user = await this.findOrCreateUser(profile, email);
    await this.users.update(user.id, {
      lastLogin: new Date(),
      lastActive: new Date(),
      isOnline: true,
    });

    const tokens = await this.jwtService.generateToken({
      id: user.id,
      userId: user.id,
      phoneNumber: user.phoneNumber ?? undefined,
      email: user.email,
      role: user.role as Role,
    });

    const needsCompletion = needsProfileCompletion(user);
    const profileCompletion = calculateProfileCompletion(user);
    const nextStep = getNextOnboardingStep(user);
    const currentStep = determineOnboardingStep(user);
    const isOnboardingRequired = nextStep !== 'completed';

    return {
      status: 'success',
      message: 'Connexion Google réussie',
      token: tokens.access,
      needsCompletion,
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
          contact_info: !!user.phoneNumber && !user.phoneNumber.startsWith('temp-'),
          address_info: !!(user.country && user.city),
          profile_photo: !!user.photo,
        },
      },
    };
  }

  private async findOrCreateUser(
    profile: GoogleProfile,
    email: string,
  ): Promise<User> {
    let user = await this.users.findByGoogleId(profile.id);

    if (!user) {
      user = await this.users.findByEmail(email);
      if (user) {
        user = await this.users.update(user.id, { googleId: profile.id });
      }
    }

    if (user) {
      return user;
    }

    const displayParts = (profile.displayName ?? '').split(' ');
    const firstName = profile.name?.givenName || displayParts[0] || '';
    const lastName =
      profile.name?.familyName ||
      (displayParts.length > 1 ? displayParts.slice(1).join(' ') : '');

    return this.users.create({
      googleId: profile.id,
      email,
      firstName,
      lastName,
      phoneNumber: `temp-${profile.id}-${Date.now()}`,
      password: '',
      country: '',
      city: '',
      department: '',
      commune: '',
      role: 'CLIENT',
      photo: profile.photos?.[0]?.value || null,
      isVerified: true,
      isProfileCompleted: false,
    });
  }
}
