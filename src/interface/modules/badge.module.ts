import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { BADGE_REPOSITORY } from '@domain/repositories/badge.repository';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import {
  BadgeLifecycleUseCase,
  CheckoutBadgeUseCase,
  ConfirmBadgePaymentUseCase,
  GetBadgeSettingsUseCase,
  GetMyBadgeUseCase,
  UpdateBadgeSettingsUseCase,
} from '@application/use-cases/badge/badge.use-case';
import { ShopPlanUseCase } from '@application/use-cases/shop/shop-plan.use-case';
import {
  CreateStoryUseCase,
  DeleteStoryUseCase,
  GetStoryMediaUseCase,
  ListModerationStoriesUseCase,
  ListStoriesUseCase,
  ModerateStoryUseCase,
} from '@application/use-cases/story/story.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaBadgeRepository } from '@infrastructure/repositories/prisma-badge.repository';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import {
  AdminBadgeController,
  BadgeController,
} from '@interface/controllers/badge.controller';
import { StoryController } from '@interface/controllers/story.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';

@Module({
  controllers: [BadgeController, AdminBadgeController, StoryController],
  providers: [
    { provide: BADGE_REPOSITORY, useClass: PrismaBadgeRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    BadgeLifecycleUseCase,
    GetBadgeSettingsUseCase,
    UpdateBadgeSettingsUseCase,
    GetMyBadgeUseCase,
    CheckoutBadgeUseCase,
    ConfirmBadgePaymentUseCase,
    ShopPlanUseCase,
    ListStoriesUseCase,
    GetStoryMediaUseCase,
    ListModerationStoriesUseCase,
    CreateStoryUseCase,
    ModerateStoryUseCase,
    DeleteStoryUseCase,
    UsersAuthGuard,
    UsersAdminGuard,
    ExpressContractFilter,
  ],
})
export class BadgeModule implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly lifecycle: BadgeLifecycleUseCase) {}

  onModuleInit() {
    const run = () => {
      void this.lifecycle.refreshAll().catch(() => undefined);
    };
    run();
    this.timer = setInterval(run, 6 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
