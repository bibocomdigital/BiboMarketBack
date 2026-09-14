import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGE_REPOSITORY,
  type MessageRepository,
} from '@domain/repositories/message.repository';

@Injectable()
export class SendSocketMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
  ) {}

  execute(senderId: number, receiverId: unknown, content: unknown) {
    return this.messages.create({
      senderId,
      receiverId: parseInt(String(receiverId), 10),
      content: content as string,
      mediaUrl: null,
      mediaType: null,
      isRead: false,
    });
  }
}

@Injectable()
export class MarkSocketMessageReadUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
  ) {}

  async execute(userId: number, messageId: unknown) {
    const parsedId = parseInt(String(messageId), 10);
    const message = await this.messages.findById(parsedId);

    if (!message || message.receiverId !== userId) {
      return null;
    }

    const updatedMessage = await this.messages.markAsRead(parsedId);
    return { updatedMessage, senderId: message.senderId };
  }
}
