import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { PASSWORD_HASHER } from '@application/ports/output/password-hasher.port';
import { SMS_SERVICE } from '@application/ports/output/sms-service.port';
import { EMAIL_SERVICE } from '@application/ports/output/email-service.port';
import { FILE_STORAGE } from '@application/ports/output/file-storage.port';
import { RegisterUserUseCase } from '@application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '@application/use-cases/auth/login-user.use-case';
import { ForgotPasswordUseCase } from '@application/use-cases/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from '@application/use-cases/auth/reset-password.use-case';
import { VerifyRegistrationUseCase } from '@application/use-cases/auth/verify-registration.use-case';
import {
  ChangePasswordUseCase,
  DeleteUserAccountUseCase,
  GetAllUsersUseCase,
  GetUserProfileUseCase,
  LogoutUserUseCase,
  UpdateUserProfileUseCase,
  UpdateUserRoleUseCase,
  VerifyAuthTokenUseCase,
} from '@application/use-cases/auth/profile-auth.use-case';
import {
  CompleteAddressInfoUseCase,
  CompleteContactInfoUseCase,
  CompletePersonalInfoUseCase,
  CompleteProfilePhotoUseCase,
  GetOnboardingStatusUseCase,
  SkipOnboardingStepUseCase,
} from '@application/use-cases/onboarding/onboarding.use-case';
import { HandleGoogleLoginUseCase } from '@application/use-cases/auth/google-login.use-case';
import {
  UpdateConnectedProfileUseCase,
  UploadUserProfilePhotoUseCase,
} from '@application/use-cases/user/user.use-case';
import { BcryptPasswordHasher } from '@infrastructure/auth/bcrypt-password-hasher';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { TwilioSmsAdapter } from '@infrastructure/sms/twilio-sms.adapter';
import { SmtpEmailAdapter } from '@infrastructure/email/smtp-email.adapter';
import { CloudinaryFileStorage } from '@infrastructure/storage/cloudinary-file-storage';
import { GoogleOAuthHttpAdapter } from '@infrastructure/auth/google-oauth.adapter';
import { GOOGLE_OAUTH } from '@application/ports/output/google-oauth.port';
import { AuthController } from '@interface/controllers/auth.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  ExpressAdminGuard,
  ExpressAuthGuard,
} from '@interface/guards/express-auth.guard';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: SMS_SERVICE, useClass: TwilioSmsAdapter },
    { provide: EMAIL_SERVICE, useClass: SmtpEmailAdapter },
    { provide: FILE_STORAGE, useClass: CloudinaryFileStorage },
    { provide: GOOGLE_OAUTH, useClass: GoogleOAuthHttpAdapter },
    RegisterUserUseCase,
    LoginUserUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    VerifyRegistrationUseCase,
    GetUserProfileUseCase,
    UpdateUserProfileUseCase,
    ChangePasswordUseCase,
    DeleteUserAccountUseCase,
    VerifyAuthTokenUseCase,
    GetAllUsersUseCase,
    UpdateUserRoleUseCase,
    LogoutUserUseCase,
    GetOnboardingStatusUseCase,
    CompletePersonalInfoUseCase,
    CompleteContactInfoUseCase,
    CompleteAddressInfoUseCase,
    CompleteProfilePhotoUseCase,
    SkipOnboardingStepUseCase,
    HandleGoogleLoginUseCase,
    UpdateConnectedProfileUseCase,
    UploadUserProfilePhotoUseCase,
    ExpressAuthGuard,
    ExpressAdminGuard,
    UsersAuthGuard,
    ExpressContractFilter,
  ],
})
export class AuthModule {}
