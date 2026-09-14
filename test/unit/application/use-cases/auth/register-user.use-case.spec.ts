import { RegisterUserUseCase } from '@application/use-cases/auth/register-user.use-case';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { UserRepository } from '@domain/repositories/user.repository';
import type { PasswordHasherPort } from '@application/ports/output/password-hasher.port';

describe('RegisterUserUseCase', () => {
  const passwordHasher: PasswordHasherPort = {
    hash: jest.fn().mockResolvedValue('hashed'),
    compare: jest.fn(),
  };

  it('refuse un téléphone déjà utilisé', async () => {
    const users = {
      findByPhoneNumber: jest.fn().mockResolvedValue({ id: 1 }),
    } as unknown as UserRepository;

    const useCase = new RegisterUserUseCase(users, passwordHasher);

    await expect(
      useCase.execute({ phoneNumber: '+22177', password: 'secret' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'PHONE_EXISTS',
    } satisfies Partial<ExpressContractException>);
  });

  it('crée un utilisateur CLIENT par défaut', async () => {
    const users = {
      findByPhoneNumber: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 9,
        firstName: 'Awa',
        lastName: 'Diop',
        phoneNumber: '+22177',
        email: null,
        role: 'CLIENT',
      }),
    } as unknown as UserRepository;

    const useCase = new RegisterUserUseCase(users, passwordHasher);
    const result = await useCase.execute({
      firstName: 'Awa',
      lastName: 'Diop',
      phoneNumber: '+22177',
      password: 'secret',
    });

    expect(result.status).toBe('success');
    expect(result.user.id).toBe(9);
    expect(result.onboarding.step).toBe('personal_info');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'CLIENT',
        isVerified: true,
        password: 'hashed',
      }),
    );
  });
});
