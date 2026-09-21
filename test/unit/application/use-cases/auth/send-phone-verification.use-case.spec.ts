import { SendPhoneVerificationCodeUseCase } from '@application/use-cases/auth/send-phone-verification.use-case';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { User } from '@domain/entities/user.entity';
import type { UserRepository } from '@domain/repositories/user.repository';
import type { SmsServicePort } from '@application/ports/output/sms-service.port';

jest.mock('@application/utils/otp.util', () => ({
  ...jest.requireActual('@application/utils/otp.util'),
  generateOtpCode: jest.fn(() => '123456'),
  hashOtpCode: jest.fn().mockResolvedValue('hashed-code'),
  getOtpExpiryDate: jest.fn(() => new Date(Date.now() + 10 * 60 * 1000)),
}));

import { generateOtpCode, hashOtpCode, getOtpExpiryDate } from '@application/utils/otp.util';

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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as unknown as User;
}

describe('SendPhoneVerificationCodeUseCase', () => {
  const smsService: SmsServicePort = {
    sendRaw: jest.fn().mockResolvedValue(undefined),
    sendCongratulation: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('génère, stocke et envoie un code par SMS', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(buildUser()),
      update: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new SendPhoneVerificationCodeUseCase(users, smsService);

    const result = await useCase.execute(1);

    expect(generateOtpCode).toHaveBeenCalled();
    expect(hashOtpCode).toHaveBeenCalledWith('123456');
    expect(getOtpExpiryDate).toHaveBeenCalled();
    expect(users.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        phoneVerificationCode: 'hashed-code',
        phoneVerificationExpiry: expect.any(Date),
      }),
    );
    expect(smsService.sendRaw).toHaveBeenCalledWith(
      '+22177',
      expect.stringContaining('123456'),
    );
    expect(result.status).toBe('success');
    expect(result.phoneNumber).toBe('+22177');
  });

  it("refuse un compte ADMIN", async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        buildUser({ role: 'ADMIN' }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new SendPhoneVerificationCodeUseCase(users, smsService);

    await expect(useCase.execute(1)).rejects.toMatchObject({
      statusCode: 403,
      code: 'PHONE_VERIFICATION_NOT_REQUIRED',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse un numéro déjà vérifié', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        buildUser({ phoneVerified: true }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new SendPhoneVerificationCodeUseCase(users, smsService);

    await expect(useCase.execute(1)).rejects.toMatchObject({
      statusCode: 400,
      code: 'PHONE_ALREADY_VERIFIED',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse un compte sans numéro de téléphone', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        buildUser({ phoneNumber: null }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new SendPhoneVerificationCodeUseCase(users, smsService);

    await expect(useCase.execute(1)).rejects.toMatchObject({
      statusCode: 400,
      code: 'PHONE_MISSING',
    } satisfies Partial<ExpressContractException>);
  });

  it('impose un délai minimum entre deux envois', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(
        buildUser({
          phoneVerificationCode: 'hashed-code',
          phoneVerificationExpiry: new Date(Date.now() + 595_000),
        }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new SendPhoneVerificationCodeUseCase(users, smsService);

    await expect(useCase.execute(1)).rejects.toMatchObject({
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
    } satisfies Partial<ExpressContractException>);
  });

  it('renvoie le code de test en dev si le SMS échoue', async () => {
    const smsError: SmsServicePort = {
      sendRaw: jest.fn().mockRejectedValue(new Error('gateway down')),
      sendCongratulation: jest.fn().mockResolvedValue(undefined),
    };

    const users = {
      findById: jest.fn().mockResolvedValue(buildUser()),
      update: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new SendPhoneVerificationCodeUseCase(users, smsError);

    const result = await useCase.execute(1);

    expect(result.status).toBe('partial_success');
    expect(result.testCode).toBe('123456');
  });
});