import type { UserRepository } from '@domain/repositories/user.repository';
import type { GoogleOAuthPort } from '@application/ports/output/google-oauth.port';
import {
  HandleGoogleLoginUseCase,
  needsProfileCompletion,
} from '@application/use-cases/auth/google-login.use-case';

const profile = {
  id: 'google-99',
  displayName: 'Awa Diop',
  name: { givenName: 'Awa', familyName: 'Diop' },
  emails: [{ value: 'awa@gmail.com' }],
  photos: [{ value: 'https://lh3.google/photo.jpg' }],
};

describe('needsProfileCompletion', () => {
  it('détecte un numéro temporaire', () => {
    expect(
      needsProfileCompletion({
        phoneNumber: 'temp-google-99-1',
        password: 'x',
        country: 'SN',
        city: 'Dakar',
        department: 'Dakar',
        commune: 'Plateau',
      }),
    ).toBe(true);
  });
});

describe('HandleGoogleLoginUseCase', () => {
  it('crée un nouvel utilisateur et exige la complétion', async () => {
    const users = {
      findByGoogleId: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 12, email: 'awa@gmail.com' }),
    } as unknown as UserRepository;
    const google: GoogleOAuthPort = {
      getAuthorizationUrl: jest.fn(),
      fetchProfile: jest.fn().mockResolvedValue(profile),
    };

    const result = await new HandleGoogleLoginUseCase(users, google).execute(
      'code',
    );

    expect(result.needsCompletion).toBe(true);
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        googleId: 'google-99',
        email: 'awa@gmail.com',
        firstName: 'Awa',
        lastName: 'Diop',
        role: 'CLIENT',
        isVerified: true,
        password: '',
      }),
    );
  });

  it('lie un compte existant par email', async () => {
    const existing = {
      id: 4,
      email: 'awa@gmail.com',
      phoneNumber: '+22177',
      password: 'hashed',
      country: 'SN',
      city: 'Dakar',
      department: 'Dakar',
      commune: 'Plateau',
    };
    const users = {
      findByGoogleId: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue({ ...existing, googleId: 'google-99' }),
    } as unknown as UserRepository;

    const result = await new HandleGoogleLoginUseCase(users, {
      getAuthorizationUrl: jest.fn(),
      fetchProfile: jest.fn().mockResolvedValue(profile),
    }).execute('code');

    expect(users.update).toHaveBeenCalledWith(4, { googleId: 'google-99' });
    expect(result.needsCompletion).toBe(false);
  });
});
