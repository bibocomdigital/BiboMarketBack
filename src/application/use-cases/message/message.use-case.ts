import { existsSync, unlinkSync } from 'node:fs';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  MESSAGE_REPOSITORY,
  type MessageRepository,
} from '@domain/repositories/message.repository';
import {
  FILE_STORAGE,
  type FileStoragePort,
} from '@application/ports/output/file-storage.port';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import {
  REALTIME_GATEWAY,
  type RealtimePort,
} from '@application/ports/output/realtime.port';

export type MessageMediaFile = {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fail(
  statusCode: number,
  message: string,
  error?: unknown,
  gated = false,
) {
  const body: Record<string, unknown> = { success: false, message };
  if (error !== undefined) {
    body.error = gated
      ? process.env.NODE_ENV === 'development'
        ? errorMessage(error)
        : 'Internal Server Error'
      : errorMessage(error);
  }
  return ExpressContractException.raw(statusCode, body);
}

function unlinkTemp(file?: MessageMediaFile) {
  if (file?.path && existsSync(file.path)) {
    unlinkSync(file.path);
  }
}

export function getMediaType(file: MessageMediaFile): 'audio' | 'image' | 'video' {
  if (
    file.mimetype.startsWith('audio/') ||
    file.originalname.toLowerCase().endsWith('.m4a')
  ) {
    return 'audio';
  }
  if (file.mimetype.startsWith('image/')) {
    return 'image';
  }
  if (file.mimetype.startsWith('video/')) {
    return 'video';
  }
  return 'image';
}

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(
    senderId: number,
    sender: { firstName?: string | null; lastName?: string | null },
    input: { receiverId?: unknown; content?: unknown },
    file?: MessageMediaFile,
  ) {
    try {
      const { receiverId, content } = input;

      if (!receiverId) {
        throw fail(400, 'Le destinataire est obligatoire');
      }

      if (!content && !file) {
        throw fail(400, 'Veuillez fournir un message ou un média');
      }

      const parsedReceiverId = parseInt(String(receiverId), 10);
      const receiver = await this.messages.findUserById(parsedReceiverId);

      if (!receiver) {
        throw fail(404, 'Destinataire non trouvé');
      }

      if (senderId === parsedReceiverId) {
        throw fail(
          400,
          'Vous ne pouvez pas vous envoyer un message à vous-même',
        );
      }

      let mediaUrl: string | null = null;
      let mediaType: 'audio' | 'image' | 'video' | null = null;

      if (file) {
        try {
          mediaType = getMediaType(file);
          mediaUrl = await this.fileStorage.uploadMessageMedia(
            file.path,
            mediaType,
          );
          unlinkTemp(file);
        } catch (cloudinaryError) {
          unlinkTemp(file);
          throw fail(
            500,
            "Erreur lors de l'envoi du média",
            cloudinaryError,
          );
        }
      }

      const message = await this.messages.create({
        senderId,
        receiverId: parsedReceiverId,
        content: (content as string) || '',
        mediaUrl,
        mediaType,
        isRead: false,
      });

      try {
        await this.notifications.create({
          userId: parsedReceiverId,
          type: 'MESSAGE',
          message: `Nouveau message de ${sender.firstName} ${sender.lastName}`,
          resourceId: message.id,
          resourceType: 'Message',
          actionUrl: `/messages/${senderId}`,
          priority: 2,
        });
      } catch {
        // On continue même si la notification échoue
      }

      this.realtime?.emitToUserRoom(parsedReceiverId, 'new_message', {
        message,
        sender: {
          id: senderId,
          name: `${sender.firstName} ${sender.lastName}`,
          photo: null,
        },
      });

      return {
        success: true,
        message: 'Message envoyé avec succès',
        data: message,
      };
    } catch (error) {
      unlinkTemp(file);
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw fail(
        500,
        "Une erreur est survenue lors de l'envoi du message",
        error,
        true,
      );
    }
  }
}

@Injectable()
export class GetConversationsUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
  ) {}

  async execute(userId: number) {
    try {
      const messages = await this.messages.findConversationMessages(userId);
      const conversationsMap = new Map<number, any>();

      for (const message of messages) {
        const isCurrentUserSender = message.senderId === userId;
        const partner = isCurrentUserSender ? message.receiver : message.sender;
        const partnerId = partner.id;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            partnerId: partner.id,
            partnerName: `${partner.firstName} ${partner.lastName}`,
            partnerPhoto: partner.photo,
            partnerRole: partner.role,
            lastMessage: message.content,
            lastMediaUrl: message.mediaUrl,
            lastMediaType: message.mediaType,
            lastMessageTime: message.createdAt,
            unreadCount: 0,
            messages: [],
          });
        }

        conversationsMap.get(partnerId).messages.push(message);
      }

      const conversations = Array.from(conversationsMap.values()).map(
        (conversation) => {
          const unreadCount = conversation.messages.filter(
            (msg: any) => msg.receiverId === userId && !msg.isRead,
          ).length;
          const lastMessage = conversation.messages[0];

          return {
            partnerId: conversation.partnerId,
            partnerName: conversation.partnerName,
            partnerPhoto: conversation.partnerPhoto,
            partnerRole: conversation.partnerRole,
            lastMessage: lastMessage?.content || '',
            lastMediaUrl: lastMessage?.mediaUrl,
            lastMediaType: lastMessage?.mediaType,
            lastMessageTime: lastMessage?.createdAt,
            unreadCount,
          };
        },
      );

      conversations.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime(),
      );

      return { success: true, data: conversations };
    } catch (error) {
      throw fail(
        500,
        'Une erreur est survenue lors de la récupération des conversations',
        error,
        true,
      );
    }
  }
}

@Injectable()
export class GetMessagesUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(userId: number, partnerId: unknown) {
    try {
      const partnerIdInt = parseInt(String(partnerId), 10);
      if (Number.isNaN(partnerIdInt)) {
        throw fail(400, 'ID de partenaire invalide');
      }

      const partner = await this.messages.findPartnerPreview(partnerIdInt);
      if (!partner) {
        throw fail(404, 'Partenaire de conversation non trouvé');
      }

      const allMessages = await this.messages.findThreadMessages(
        userId,
        partnerIdInt,
      );

      const visibleMessages = allMessages.filter((message) => {
        if (message.senderId === userId && message.deletedForSender === true) {
          return false;
        }
        if (
          message.receiverId === userId &&
          message.deletedForReceiver === true
        ) {
          return false;
        }
        return true;
      });

      const unreadMessageIds = visibleMessages
        .filter(
          (msg) =>
            msg.senderId === partnerIdInt &&
            msg.receiverId === userId &&
            !msg.isRead,
        )
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0) {
        await this.messages.markReadByIds(unreadMessageIds);
        this.realtime?.emitToUserRoom(partnerIdInt, 'messages_read', {
          conversationPartnerId: userId,
        });
      }

      return {
        success: true,
        data: { partner, messages: visibleMessages },
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw fail(
        500,
        'Une erreur est survenue lors de la récupération des messages',
        error,
      );
    }
  }
}

@Injectable()
export class UpdateMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(userId: number, messageId: unknown, content: unknown) {
    try {
      if (!content) {
        throw fail(400, 'Le contenu du message est obligatoire');
      }

      const messageIdInt = parseInt(String(messageId), 10);
      if (Number.isNaN(messageIdInt)) {
        throw fail(400, 'ID de message invalide');
      }

      const message = await this.messages.findById(messageIdInt);
      if (!message) {
        throw fail(404, 'Message non trouvé');
      }

      if (message.senderId !== userId) {
        throw fail(403, "Vous n'êtes pas autorisé à modifier ce message");
      }

      const updatedMessage = await this.messages.updateContent(
        messageIdInt,
        content as string,
      );

      this.realtime?.emitToUserRoom(message.receiverId, 'message_updated', {
        message: updatedMessage,
      });

      return {
        success: true,
        message: 'Message mis à jour avec succès',
        data: updatedMessage,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw fail(
        500,
        'Une erreur est survenue lors de la mise à jour du message',
        error,
      );
    }
  }
}

@Injectable()
export class DeleteMessageUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(userId: number, messageId: unknown, forEveryoneQuery?: unknown) {
    try {
      const forEveryone = forEveryoneQuery === 'true';
      const messageIdInt = parseInt(String(messageId), 10);
      if (Number.isNaN(messageIdInt)) {
        throw fail(400, 'ID de message invalide');
      }

      const message = await this.messages.findById(messageIdInt);
      if (!message) {
        throw fail(404, 'Message non trouvé');
      }

      if (message.senderId !== userId && message.receiverId !== userId) {
        throw fail(403, "Vous n'êtes pas autorisé à supprimer ce message");
      }

      if (forEveryone && message.senderId !== userId) {
        throw fail(403, "Seul l'expéditeur peut supprimer le message pour tous");
      }

      if (forEveryone) {
        const messageAge =
          Date.now() - new Date(message.createdAt).getTime();
        if (messageAge > 30 * 60 * 1000) {
          throw fail(
            403,
            'Vous ne pouvez pas supprimer ce message le temps à passer',
          );
        }

        if (message.mediaUrl) {
          try {
            await this.fileStorage.deleteMessageMedia(
              message.mediaUrl,
              message.mediaType,
            );
          } catch {
            // On continue même si la suppression du média échoue
          }
        }

        await this.messages.transformDeletedForEveryone(messageIdInt);
        this.realtime?.emitToUserRoom(message.receiverId, 'message_deleted', {
          messageId: messageIdInt,
          forEveryone: true,
        });
        this.realtime?.emitToUserRoom(message.senderId, 'message_deleted', {
          messageId: messageIdInt,
          forEveryone: true,
        });
      } else if (message.senderId === userId) {
        await this.messages.markDeletedForSender(messageIdInt);
        this.realtime?.emitToUserRoom(userId, 'message_deleted', {
          messageId: messageIdInt,
          forEveryone: false,
        });
      } else {
        await this.messages.markDeletedForReceiver(messageIdInt);
        this.realtime?.emitToUserRoom(userId, 'message_deleted', {
          messageId: messageIdInt,
          forEveryone: false,
        });
      }

      return {
        success: true,
        message: forEveryone
          ? 'Message supprimé pour tous les utilisateurs'
          : 'Message supprimé pour vous uniquement',
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw fail(
        500,
        'Une erreur est survenue lors de la suppression du message',
        error,
      );
    }
  }
}

@Injectable()
export class MarkMessageAsReadUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(userId: number, messageId: unknown) {
    try {
      const messageIdInt = parseInt(String(messageId), 10);
      if (Number.isNaN(messageIdInt)) {
        throw fail(400, 'ID de message invalide');
      }

      const message = await this.messages.findById(messageIdInt);
      if (!message) {
        throw fail(404, 'Message non trouvé');
      }

      if (message.receiverId !== userId) {
        throw fail(
          403,
          "Vous n'êtes pas autorisé à marquer ce message comme lu",
        );
      }

      const updatedMessage = await this.messages.markAsRead(messageIdInt);

      this.realtime?.emitToUserRoom(message.senderId, 'message_read', {
        messageId: messageIdInt,
        conversationPartnerId: userId,
      });

      return {
        success: true,
        message: 'Message marqué comme lu',
        data: updatedMessage,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw fail(
        500,
        'Une erreur est survenue lors du marquage du message comme lu',
        error,
      );
    }
  }
}

@Injectable()
export class MarkAllMessagesAsReadUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(userId: number, partnerId: unknown) {
    try {
      const partnerIdInt = parseInt(String(partnerId), 10);
      if (Number.isNaN(partnerIdInt)) {
        throw fail(400, 'ID de partenaire invalide');
      }

      const count = await this.messages.markAllFromPartnerAsRead(
        userId,
        partnerIdInt,
      );

      if (count > 0) {
        this.realtime?.emitToUserRoom(partnerIdInt, 'messages_read', {
          conversationPartnerId: userId,
        });
      }

      return {
        success: true,
        message: `${count} message(s) marqué(s) comme lu(s)`,
        count,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw fail(
        500,
        'Une erreur est survenue lors du marquage des messages comme lus',
        error,
      );
    }
  }
}

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
  ) {}

  async execute(userId: number) {
    try {
      const unreadMessages = await this.messages.findUnreadForUser(userId);
      return {
        success: true,
        unreadCount: unreadMessages.length,
        unreadMessages,
      };
    } catch (error) {
      throw fail(
        500,
        'Erreur interne lors de la récupération des messages non lus',
        error,
      );
    }
  }
}

@Injectable()
export class SearchMessagesUseCase {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
  ) {}

  async execute(userId: number, query: unknown) {
    try {
      if (!query) {
        throw fail(400, 'Le terme de recherche est obligatoire');
      }

      const messages = await this.messages.search(userId, query as string);
      return { success: true, data: messages };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw fail(
        500,
        'Une erreur est survenue lors de la recherche de messages',
        error,
      );
    }
  }
}
