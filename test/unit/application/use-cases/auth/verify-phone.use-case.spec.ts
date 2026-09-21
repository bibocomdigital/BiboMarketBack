import { VerifyPhoneUseCase } from '@application/use-cases/auth/verify-phone.use-case';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { User } from '@domain/entities/user.entity';
import type { UserRepository } from '@domain/repositories/user.repository';

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
    tokenExpiry: null,
    resetCode: null,
    phoneVerified: false,
    phoneVerificationCode: 'hashed-code',
    phoneVerificationExpiry: new Date(NOW + 5 * 60 * 1000),
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

describe('VerifyPhoneUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyOtpCode as jest.Mock).mockResolvedValue(true);
  });

  it('vérifie le numéro et marque le compte comme vérifié', async () => {
    const updated = buildUser({ phoneVerified: true });
    const users = {
      findById: jest.fn().mockResolvedValue(buildUser()),
      update: jest.fn().mockResolvedValue(updated),
    } as unknown as UserRepository;

    const useCase = new VerifyPhoneUseCase(users);

    const result = await useCase.execute(1, '123456');

    expect(verifyOtpCode).toHaveBeenCalledWith('123456', 'hashed-code');
    expect(users.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
      }),
    );
    expect(result.phoneVerified).toBe(true);
  });

  it('refuse un numéro déjà vérifié', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        buildUser({ phoneVerified: true }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new VerifyPhoneUseCase(users);

    await expect(useCase.execute(1, '123456')).rejects.toMatchObject({
      statusCode: 400,
      code: 'PHONE_ALREADY_VERIFIED',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse quand aucun code n’est en attente', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        buildUser({
          phoneVerificationCode: null,
          phoneVerificationExpiry: null,
        }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new VerifyPhoneUseCase(users);

    await expect(useCase.execute(1, '123456')).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_OTP_REQUESTED',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse un code expiré', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        buildUser({
          phoneVerificationExpiry: new Date(NOW - 1000),
        }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new VerifyPhoneUseCase(users);

    await expect(useCase.execute(1, '123456')).rejects.toMatchObject({
      statusCode: 401,
      code: 'OTP_EXPIRED',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse un code incorrect', async () => {
    (verifyOtpCode as jest.Mock).mockResolvedValue(false);

    const users = {
      findById: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new VerifyPhoneUseCase(users);

    await expect(useCase.execute(1, '000000')).rejects.toMatchObject({
      statusCode: 401,
      code: 'OTP_INVALID',
    } satisfies Partial<ExpressContractException>);
  });
});