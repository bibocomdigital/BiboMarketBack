import { ResetPasswordUseCase } from '@application/use-cases/auth/reset-password.use-case';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { User } from '@domain/entities/user.entity';
import type { UserRepository } from '@domain/repositories/user.repository';
import type { PasswordHasherPort } from '@application/ports/output/password-hasher.port';

jest.mock('@application/utils/otp.util', () => ({
  ...jest.requireActual('@application/utils/otp.util'),
  verifyOtpCode: jest.fn(),
}));

import { verifyOtpCode } from '@application/utils/otp.util';

const NOW = Date.now();

function buildUser(overrides: Partial<User> = {}) {
  return {
    id: 1,
    email: null,
    password: 'hash',
    role: 'CLIENT',
    isVerified: true,
    verificationCode: null,
    tokenExpiry: new Date(NOW + 30 * 60 * 1000),
    resetCode: 'hashed-code',
    phoneVerified: false,
    phoneVerificationCode: null,
    phoneVerificationExpiry: null,
    onboardingStep: 'contact_info',
    profileCompletion: 50,
    isProfileCompleted: false,
    firstName: 'Awa',
    lastName: 'Diop',
    gender: null,
    dateOfBirth: null,
    phoneNumber: '+22177',
    whatsappNumber: null,
    country: null,
    city: null,
    department: null,
    commune: null,
    address: null,
    photo: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  } as unknown as User;
}

describe('ResetPasswordUseCase', () => {
  const passwordHasher: PasswordHasherPort = {
    hash: jest.fn().mockResolvedValue('new-hashed-password'),
    compare: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyOtpCode as jest.Mock).mockResolvedValue(true);
  });

  it('réinitialise le mot de passe et nettoie le code', async () => {
    const updated = buildUser();
    const users = {
      findFirstByPhoneOrEmail: jest.fn().mockResolvedValue(
        buildUser({ email: 'awa@exemple.com' }) as unknown as User,
      ),
      update: jest.fn().mockResolvedValue(updated),
    } as unknown as UserRepository;

    const useCase = new ResetPasswordUseCase(users, passwordHasher);

    const result = await useCase.execute({
      email: 'awa@exemple.com',
      resetCode: '123456',
      newPassword: 'nouveau-mot-de-passe',
    });

    expect(verifyOtpCode).toHaveBeenCalledWith('123456', 'hashed-code');
    expect(passwordHasher.hash).toHaveBeenCalledWith('nouveau-mot-de-passe');
    expect(users.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        password: 'new-hashed-password',
        resetCode: null,
        tokenExpiry: null,
      }),
    );
    expect(result.status).toBe('success');
  });

  it('refuse un utilisateur introuvable', async () => {
    const users = {
      findFirstByPhoneOrEmail: jest.fn().mockResolvedValue(null),
    } as unknown as UserRepository;

    const useCase = new ResetPasswordUseCase(users, passwordHasher);

    await expect(
      useCase.execute({ phone: '+22177', resetCode: '123456', newPassword: 'x' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse quand aucun code n’est en attente', async () => {
    const users = {
      findFirstByPhoneOrEmail: jest.fn().mockResolvedValue(
        buildUser({ resetCode: null }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new ResetPasswordUseCase(users, passwordHasher);

    await expect(
      useCase.execute({ email: 'awa@exemple.com', resetCode: '123456', newPassword: 'x' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'RESET_CODE_MISSING',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse un code expiré', async () => {
    const users = {
      findFirstByPhoneOrEmail: jest.fn().mockResolvedValue(
        buildUser({ tokenExpiry: new Date(NOW - 1000) }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new ResetPasswordUseCase(users, passwordHasher);

    await expect(
      useCase.execute({ email: 'awa@exemple.com', resetCode: '123456', newPassword: 'x' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'RESET_CODE_EXPIRED',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse un code incorrect', async () => {
    (verifyOtpCode as jest.Mock).mockResolvedValue(false);

    const users = {
      findFirstByPhoneOrEmail: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new ResetPasswordUseCase(users, passwordHasher);

    await expect(
      useCase.execute({ email: 'awa@exemple.com', resetCode: '000000', newPassword: 'x' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'RESET_CODE_INCORRECT',
    } satisfies Partial<ExpressContractException>);
  });
});