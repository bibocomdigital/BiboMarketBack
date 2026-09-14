import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import type { User } from '@domain/entities/user.entity';
import {
  GOOGLE_OAUTH,
  type GoogleOAuthPort,
} from '@application/ports/output/google-oauth.port';

export function needsProfileCompletion(user: {
  phoneNumber?: string | null;
  password?: string | null;
  country?: string | null;
  city?: string | null;
  department?: string | null;
  commune?: string | null;
}): boolean {
  return (
    !user.phoneNumber ||
    user.phoneNumber.startsWith('temp-') ||
    !user.password ||
    !user.country ||
    !user.city ||
    !user.department ||
    !user.commune
  );
}

@Injectable()
export class HandleGoogleLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(GOOGLE_OAUTH) private readonly google: GoogleOAuthPort,
  ) {}

  async execute(code: string): Promise<{ user: User; needsCompletion: boolean }> {
    const profile = await this.google.fetchProfile(code);
    let user = await this.users.findByGoogleId(profile.id);

    if (!user && profile.emails?.length) {
      user = await this.users.findByEmail(profile.emails[0].value);
      if (user) {
        user = await this.users.update(user.id, { googleId: profile.id });
      }
    }

    if (!user) {
      const displayParts = (profile.displayName ?? '').split(' ');
      const firstName =
        profile.name?.givenName || displayParts[0] || '';
      const lastName =
        profile.name?.familyName ||
        (displayParts.length > 1 ? displayParts.slice(1).join(' ') : '');

      user = await this.users.create({
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
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

      return { user, needsCompletion: true };
    }

    return { user, needsCompletion: needsProfileCompletion(user) };
  }
}
