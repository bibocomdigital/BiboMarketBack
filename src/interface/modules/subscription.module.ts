import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { SUBSCRIPTION_REPOSITORY } from '@domain/repositories/subscription.repository';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import {
  CheckIfFollowingUseCase,
  GetSuggestedUsersUseCase,
  GetUserFollowersUseCase,
  GetUserFollowingUseCase,
  ToggleFollowUseCase,
} from '@application/use-cases/subscription/subscription.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaSubscriptionRepository } from '@infrastructure/repositories/prisma-subscription.repository';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import { SubscriptionController } from '@interface/controllers/subscription.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [SubscriptionController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: PrismaSubscriptionRepository },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    ToggleFollowUseCase,
    GetUserFollowersUseCase,
    GetUserFollowingUseCase,
    CheckIfFollowingUseCase,
    GetSuggestedUsersUseCase,
    UsersAuthGuard,
    ExpressContractFilter,
  ],
  exports: [GetSuggestedUsersUseCase, SUBSCRIPTION_REPOSITORY],
})
export class SubscriptionModule {}
