import { LoginUserUseCase } from './login-user.use-case';
import type { UserRepository } from '@domain/repositories/user.repository';
import type { PasswordHasherPort } from '@application/ports/output/password-hasher.port';
import type { JwtServicePort } from '@application/ports/output/jwt-service.port';
import { Role } from '@domain/types/role';

describe('LoginUserUseCase', () => {
  const user = {
    id: 4,
    email: 'a@test.com',
    password: 'hashed',
    role: Role.CLIENT,
    phoneNumber: '+22177',
    firstName: 'Awa',
    lastName: 'Diop',
    photo: null,
    country: 'SN',
    city: 'Dakar',
  };

  it('renvoie token + onboarding comme Express', async () => {
    const users = {
      findFirstByPhoneOrEmail: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const passwordHasher: PasswordHasherPort = {
      hash: jest.fn(),
      compare: jest.fn().mockResolvedValue(true),
    };

    const jwtService: JwtServicePort = {
      verifyToken: jest.fn(),
      generateToken: jest.fn().mockResolvedValue({
        access: 'jwt-token',
        refresh: 'jwt-token',
      }),
      signPayload: jest.fn(),
      revokeToken: jest.fn(),
    };

    const useCase = new LoginUserUseCase(users, passwordHasher, jwtService);
    const result = await useCase.execute({
      phoneNumber: '+22177',
      password: 'secret',
    });

    expect(result).toMatchObject({
      status: 'success',
      message: 'Connexion réussie',
      token: 'jwt-token',
      user: { id: 4, phoneNumber: '+22177' },
    });
    expect(result.onboarding.steps.address_info).toBe(true);
  });

  it('refuse un mot de passe incorrect', async () => {
    const users = {
      findFirstByPhoneOrEmail: jest.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const useCase = new LoginUserUseCase(
      users,
      { hash: jest.fn(), compare: jest.fn().mockResolvedValue(false) },
      {
        verifyToken: jest.fn(),
        generateToken: jest.fn(),
        signPayload: jest.fn(),
        revokeToken: jest.fn(),
      },
    );

    await expect(
      useCase.execute({ phoneNumber: '+22177', password: 'bad' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS_PWD',
    });
  });
});
