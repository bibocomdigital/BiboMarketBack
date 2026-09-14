import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { NOTIFICATION_REPOSITORY } from '@domain/repositories/notification.repository';
import {
  DeleteAllNotificationsUseCase,
  DeleteNotificationUseCase,
  GetUserNotificationsUseCase,
  MarkAllNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from '@application/use-cases/notification/notification.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaNotificationRepository } from '@infrastructure/repositories/prisma-notification.repository';
import { NotificationController } from '@interface/controllers/notification.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [NotificationController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    GetUserNotificationsUseCase,
    MarkNotificationAsReadUseCase,
    MarkAllNotificationsAsReadUseCase,
    DeleteNotificationUseCase,
    DeleteAllNotificationsUseCase,
    UsersAuthGuard,
    ExpressContractFilter,
  ],
})
export class NotificationModule {}
