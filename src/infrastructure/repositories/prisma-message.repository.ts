import { Injectable } from '@nestjs/common';
import type {
  MessageRepository,
  MessageWriteInput,
} from '@domain/repositories/message.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const senderPreview = {
  select: { id: true, firstName: true, lastName: true, photo: true },
} as const;

const conversationUserPreview = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    photo: true,
    role: true,
  },
} as const;

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findPartnerPreview(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: conversationUserPreview.select,
    });
  }

  create(data: MessageWriteInput) {
    return this.prisma.message.create({
      data,
      include: { sender: senderPreview },
    });
  }

  findConversationMessages(userId: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, deletedForSender: false },
          { receiverId: userId, deletedForReceiver: false },
        ],
      },
      include: {
        sender: conversationUserPreview,
        receiver: conversationUserPreview,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findThreadMessages(userId: number, partnerId: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: { sender: senderPreview },
    });
  }

  async markReadByIds(ids: number[]): Promise<void> {
    await this.prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });
  }

  findById(id: number) {
    return this.prisma.message.findUnique({ where: { id } });
  }

  updateContent(id: number, content: string) {
    return this.prisma.message.update({
      where: { id },
      data: { content },
    });
  }

  async transformDeletedForEveryone(id: number): Promise<void> {
    await this.prisma.message.update({
      where: { id },
      data: {
        content: 'Ce message a été supprimé',
        mediaUrl: null,
        mediaType: 'text',
      },
    });
  }

  async markDeletedForSender(id: number): Promise<void> {
    await this.prisma.message.update({
      where: { id },
      data: { deletedForSender: true },
    });
  }

  async markDeletedForReceiver(id: number): Promise<void> {
    await this.prisma.message.update({
      where: { id },
      data: { deletedForReceiver: true },
    });
  }

  markAsRead(id: number) {
    return this.prisma.message.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllFromPartnerAsRead(userId: number, partnerId: number) {
    const result = await this.prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });
    return result.count;
  }

  findUnreadForUser(userId: number) {
    return this.prisma.message.findMany({
      where: { receiverId: userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            photo: true,
          },
        },
      },
    });
  }

  search(userId: number, query: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        content: { contains: query },
      },
      include: {
        sender: senderPreview,
        receiver: senderPreview,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
