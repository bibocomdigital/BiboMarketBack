import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import { PlatformUseCase } from '@application/use-cases/platform/platform.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import { PlatformController } from '@interface/controllers/platform.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';

@Module({
  controllers: [PlatformController],
  providers: [
    PlatformUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    UsersAuthGuard,
    UsersAdminGuard,
    ExpressContractFilter,
  ],
})
export class PlatformModule {}
