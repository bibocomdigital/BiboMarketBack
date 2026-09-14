import { ListUsersUseCase, GetUserByIdUseCase } from '@application/use-cases/user/user.use-case';
import type { UserRepository } from '@domain/repositories/user.repository';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';

const sample = {
  id: 1,
  email: 'a@test.com',
  password: 'secret',
  role: 'CLIENT',
  isVerified: true,
  verificationCode: null,
  tokenExpiry: null,
  resetCode: null,
  onboardingStep: 'completed',
  profileCompletion: 100,
  isProfileCompleted: true,
  firstName: 'Awa',
  lastName: 'Diop',
  gender: null,
  dateOfBirth: null,
  phoneNumber: '+22177',
  whatsappNumber: null,
  country: 'SN',
  city: 'Dakar',
  department: null,
  commune: null,
  address: null,
  photo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ListUsersUseCase', () => {
  it('renvoie { status, data } sans mot de passe', async () => {
    const users = {
      findAll: jest.fn().mockResolvedValue([sample]),
    } as unknown as UserRepository;

    const result = await new ListUsersUseCase(users).execute();

    expect(result.status).toBe('success');
    expect(result.data[0]).toMatchObject({ id: 1, firstName: 'Awa' });
    expect(result.data[0]).not.toHaveProperty('password');
  });
});

describe('GetUserByIdUseCase', () => {
  it('refuse un id invalide', async () => {
    const users = { findById: jest.fn() } as unknown as UserRepository;

    await expect(new GetUserByIdUseCase(users).execute(Number.NaN)).rejects.toBeInstanceOf(
      ExpressContractException,
    );
  });

  it('renvoie { status, user }', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(sample),
    } as unknown as UserRepository;

    const result = await new GetUserByIdUseCase(users).execute(1);

    expect(result).toEqual({
      status: 'success',
      user: expect.objectContaining({ id: 1, email: 'a@test.com' }),
    });
  });
});
