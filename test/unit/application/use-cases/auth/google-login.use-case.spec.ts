import type { UserRepository } from '@domain/repositories/user.repository';
import type { GoogleOAuthPort } from '@application/ports/output/google-oauth.port';
import type { JwtServicePort } from '@application/ports/output/jwt-service.port';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
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
  emailVerified: true,
};

function jwtStub(): JwtServicePort {
  return {
    generateToken: jest.fn().mockResolvedValue({ access: 'jwt-access', refresh: 'jwt-refresh' }),
    verifyToken: jest.fn(),
    signPayload: jest.fn(),
    revokeToken: jest.fn(),
  };
}

describe('needsProfileCompletion', () => {
  it('détecte un numéro temporaire', () => {
    expect(
      needsProfileCompletion({
        firstName: 'Awa',
        lastName: 'Diop',
        phoneNumber: 'temp-google-99-1',
      }),
    ).toBe(true);
  });

  it('n’exige pas l’adresse si le téléphone est renseigné', () => {
    expect(
      needsProfileCompletion({
        firstName: 'Awa',
        lastName: 'Diop',
        phoneNumber: '+221770000000',
      }),
    ).toBe(false);
  });
});

describe('HandleGoogleLoginUseCase', () => {
  it('crée un nouvel utilisateur et exige la complétion', async () => {
    const created = {
      id: 12,
      email: 'awa@gmail.com',
      phoneNumber: 'temp-google-99-1',
      password: '',
      firstName: 'Awa',
      lastName: 'Diop',
      role: 'CLIENT',
      photo: 'https://lh3.google/photo.jpg',
      country: '',
      city: '',
      phoneVerified: false,
      googleId: 'google-99',
    };
    const users = {
      findByGoogleId: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(created),
      update: jest.fn().mockResolvedValue(created),
    } as unknown as UserRepository;
    const google: GoogleOAuthPort = {
      getAuthorizationUrl: jest.fn(),
      fetchProfile: jest.fn(),
      verifyIdToken: jest.fn().mockResolvedValue(profile),
    };

    const result = await new HandleGoogleLoginUseCase(
      users,
      google,
      jwtStub(),
    ).execute({ idToken: 'id-token' });

    expect(result.needsCompletion).toBe(true);
    expect(result.token).toBe('jwt-access');
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
      firstName: 'Awa',
      lastName: 'Diop',
      role: 'CLIENT',
      photo: null,
      phoneVerified: true,
      googleId: 'google-99',
    };
    const users = {
      findByGoogleId: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(existing),
    } as unknown as UserRepository;

    const result = await new HandleGoogleLoginUseCase(
      users,
      {
        getAuthorizationUrl: jest.fn(),
        fetchProfile: jest.fn(),
        verifyIdToken: jest.fn().mockResolvedValue(profile),
      },
      jwtStub(),
    ).execute({ idToken: 'id-token' });

    expect(users.update).toHaveBeenCalledWith(4, { googleId: 'google-99' });
    expect(result.needsCompletion).toBe(false);
    expect(result.token).toBe('jwt-access');
  });

  it('refuse un email Google non vérifié', async () => {
    const users = {
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
    } as unknown as UserRepository;

    await expect(
      new HandleGoogleLoginUseCase(
        users,
        {
          getAuthorizationUrl: jest.fn(),
          fetchProfile: jest.fn(),
          verifyIdToken: jest
            .fn()
            .mockResolvedValue({ ...profile, emailVerified: false }),
        },
        jwtStub(),
      ).execute({ idToken: 'id-token' }),
    ).rejects.toBeInstanceOf(ExpressContractException);
  });
});
