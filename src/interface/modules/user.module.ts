import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { PASSWORD_HASHER } from '@application/ports/output/password-hasher.port';
import { EMAIL_SERVICE } from '@application/ports/output/email-service.port';
import {
  CreateUserUseCase,
  DeleteUserByIdUseCase,
  GetConnectedProfileUseCase,
  GetUserByIdUseCase,
  ListUsersUseCase,
  UpdateConnectedProfileUseCase,
  UpdateUserByIdUseCase,
  UploadUserProfilePhotoUseCase,
} from '@application/use-cases/user/user.use-case';
import { BcryptPasswordHasher } from '@infrastructure/auth/bcrypt-password-hasher';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { SmtpEmailAdapter } from '@infrastructure/email/smtp-email.adapter';
import { UserController } from '@interface/controllers/user.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  UsersAuthGuard,
  UsersMerchantGuard,
} from '@interface/guards/users-auth.guard';
import { SubscriptionModule } from './subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [UserController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: EMAIL_SERVICE, useClass: SmtpEmailAdapter },
    ListUsersUseCase,
    GetUserByIdUseCase,
    CreateUserUseCase,
    UpdateUserByIdUseCase,
    DeleteUserByIdUseCase,
    GetConnectedProfileUseCase,
    UpdateConnectedProfileUseCase,
    UploadUserProfilePhotoUseCase,
    UsersAuthGuard,
    UsersMerchantGuard,
    ExpressContractFilter,
  ],
})
export class UserModule {}
