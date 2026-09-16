import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  NotificationInput,
  NotificationServicePort,
} from '@application/ports/output/notification.port';
import {
  REALTIME_GATEWAY,
  type RealtimePort,
} from '@application/ports/output/realtime.port';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type { NotificationType } from '../../generated/prisma/enums';

@Injectable()
export class PrismaNotificationService implements NotificationServicePort {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async create(input: NotificationInput): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as NotificationType,
        message: input.message,
        actionUrl: input.actionUrl ?? null,
        resourceId: input.resourceId ?? null,
        resourceType: input.resourceType ?? null,
        priority: input.priority ?? 0,
        isRead: false,
      },
    });

    await this.realtime?.emitToUser(input.userId, 'new_notification', notification);
  }
}
