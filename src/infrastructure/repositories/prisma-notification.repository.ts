import { Injectable } from '@nestjs/common';
import type { NotificationRepository } from '@domain/repositories/notification.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: number) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        NOT: {
          AND: [
            { type: 'MESSAGE' },
            { resourceType: 'Message' },
            { message: { startsWith: 'Nouveau message' } },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.prisma.notification.delete({ where: { id } });
  }

  async deleteAllByUserId(userId: number): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { userId } });
  }
}
