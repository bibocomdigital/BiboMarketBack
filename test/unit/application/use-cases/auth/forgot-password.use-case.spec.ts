import { ForgotPasswordUseCase } from '@application/use-cases/auth/forgot-password.use-case';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { User } from '@domain/entities/user.entity';
import type { UserRepository } from '@domain/repositories/user.repository';
import type { EmailServicePort } from '@application/ports/output/email-service.port';
import type { SmsServicePort } from '@application/ports/output/sms-service.port';

jest.mock('@application/utils/otp.util', () => ({
  ...jest.requireActual('@application/utils/otp.util'),
  generateOtpCode: jest.fn(() => '123456'),
  hashOtpCode: jest.fn().mockResolvedValue('hashed-code'),
  getOtpExpiryDate: jest.fn(() => new Date(Date.now() + 60 * 60 * 1000)),
}));

import { generateOtpCode, hashOtpCode, getOtpExpiryDate } from '@application/utils/otp.util';

const RESET_CODE_TTL_MS = 60 * 60 * 1000;

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

describe('ForgotPasswordUseCase', () => {
  const smsService: SmsServicePort = {
    sendRaw: jest.fn().mockResolvedValue(undefined),
    sendCongratulation: jest.fn().mockResolvedValue(undefined),
  };
  const emailService: EmailServicePort = {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendContactMerchant: jest.fn().mockResolvedValue(undefined),
    sendContactConfirmation: jest.fn().mockResolvedValue(undefined),
    sendContactResponse: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('génère, stocke et envoie un code par email', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(buildUser({ email: 'awa@exemple.com' })),
      update: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new ForgotPasswordUseCase(users, emailService, smsService);

    const result = await useCase.execute({ email: 'awa@exemple.com' });

    expect(generateOtpCode).toHaveBeenCalled();
    expect(hashOtpCode).toHaveBeenCalledWith('123456');
    expect(getOtpExpiryDate).toHaveBeenCalledWith(RESET_CODE_TTL_MS);
    expect(users.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        resetCode: 'hashed-code',
        tokenExpiry: expect.any(Date),
      }),
    );
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      'awa@exemple.com',
      '123456',
    );
    expect(smsService.sendRaw).not.toHaveBeenCalled();
    expect(result.status).toBe('success');
    expect(result.email).toBe('awa@exemple.com');
  });

  it('génère, stocke et envoie un code par SMS', async () => {
    const users = {
      findByPhoneNumber: jest.fn().mockResolvedValue(buildUser()),
      update: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new ForgotPasswordUseCase(users, emailService, smsService);

    const result = await useCase.execute({ phoneNumber: '+22177' });

    expect(smsService.sendRaw).toHaveBeenCalledWith(
      '+22177',
      expect.stringContaining('123456'),
    );
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    expect(result.status).toBe('success');
    expect(result.phoneNumber).toBe('+22177');
  });

  it('refuse de fournir à la fois email et téléphone', async () => {
    const users = {} as unknown as UserRepository;
    const useCase = new ForgotPasswordUseCase(users, emailService, smsService);

    await expect(
      useCase.execute({ email: 'a@b.c', phoneNumber: '+22177' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_IDENTIFIER',
    } satisfies Partial<ExpressContractException>);
  });

  it('refuse un identifiant sans compte associé', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
    } as unknown as UserRepository;

    const useCase = new ForgotPasswordUseCase(users, emailService, smsService);

    await expect(useCase.execute({ email: 'inconnu@exemple.com' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    } satisfies Partial<ExpressContractException>);
  });

  it("refuse un compte sans numéro sur le canal SMS", async () => {
    const users = {
      findByPhoneNumber: jest.fn().mockResolvedValue(
        buildUser({ phoneNumber: null }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new ForgotPasswordUseCase(users, emailService, smsService);

    await expect(useCase.execute({ phoneNumber: '+22177' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'PHONE_MISSING',
    } satisfies Partial<ExpressContractException>);
  });

  it('impose un délai minimum entre deux envois', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(
        buildUser({
          email: 'awa@exemple.com',
          resetCode: 'hashed-code',
          tokenExpiry: new Date(Date.now() + RESET_CODE_TTL_MS),
        }) as unknown as User,
      ),
    } as unknown as UserRepository;

    const useCase = new ForgotPasswordUseCase(users, emailService, smsService);

    await expect(
      useCase.execute({ email: 'awa@exemple.com' }),
    ).rejects.toMatchObject({
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
    } satisfies Partial<ExpressContractException>);
  });

  it('autorise un nouvel envoi une fois le délai écoulé', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(
        buildUser({
          email: 'awa@exemple.com',
          resetCode: 'hashed-code',
          tokenExpiry: new Date(Date.now() + RESET_CODE_TTL_MS - 61_000),
        }) as unknown as User,
      ),
      update: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new ForgotPasswordUseCase(users, emailService, smsService);

    const result = await useCase.execute({ email: 'awa@exemple.com' });

    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      'awa@exemple.com',
      '123456',
    );
    expect(result.status).toBe('success');
  });

  it('renvoie le code de test en dev si le SMS échoue', async () => {
    const smsError: SmsServicePort = {
      sendRaw: jest.fn().mockRejectedValue(new Error('gateway down')),
      sendCongratulation: jest.fn().mockResolvedValue(undefined),
    };

    const users = {
      findByPhoneNumber: jest.fn().mockResolvedValue(buildUser()),
      update: jest.fn().mockResolvedValue(buildUser()),
    } as unknown as UserRepository;

    const useCase = new ForgotPasswordUseCase(users, emailService, smsError);

    const result = await useCase.execute({ phoneNumber: '+22177' });

    expect(result.status).toBe('partial_success');
    expect(result.testResetCode).toBe('123456');
  });
});