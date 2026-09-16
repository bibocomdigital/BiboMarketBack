import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '@domain/repositories/notification.repository';
import { isChatInboxNotification } from '@application/notifications/chat-inbox-notification';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rawUnhandled(error: unknown) {
  return ExpressContractException.raw(500, {
    status: 'error',
    message: 'Something went wrong!',
    error:
      process.env.NODE_ENV === 'development'
        ? errorMessage(error)
        : 'Internal Server Error',
  });
}

@Injectable()
export class GetUserNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(userId: number) {
    try {
      const items = await this.notifications.findByUserId(userId);
      return items.filter((item) => !isChatInboxNotification(item));
    } catch (error) {
      throw rawUnhandled(error);
    }
  }
}

@Injectable()
export class MarkNotificationAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(id: unknown) {
    try {
      return await this.notifications.markAsRead(Number(id));
    } catch (error) {
      throw rawUnhandled(error);
    }
  }
}

@Injectable()
export class MarkAllNotificationsAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(userId: number) {
    try {
      await this.notifications.markAllAsRead(userId);
      return {
        message: 'Toutes les notifications ont été marquées comme lues.',
      };
    } catch (error) {
      throw rawUnhandled(error);
    }
  }
}

@Injectable()
export class DeleteNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(id: unknown) {
    try {
      await this.notifications.deleteById(Number(id));
      return { message: 'Notification supprimée avec succès.' };
    } catch (error) {
      throw rawUnhandled(error);
    }
  }
}

@Injectable()
export class DeleteAllNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(userId: number) {
    try {
      await this.notifications.deleteAllByUserId(userId);
      return { message: 'Toutes les notifications ont été supprimées.' };
    } catch (error) {
      throw rawUnhandled(error);
    }
  }
}
