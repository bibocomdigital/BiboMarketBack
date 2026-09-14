import type { MessageRepository } from '@domain/repositories/message.repository';
import type { FileStoragePort } from '@application/ports/output/file-storage.port';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import {
  DeleteMessageUseCase,
  GetConversationsUseCase,
  GetMessagesUseCase,
  SearchMessagesUseCase,
  SendMessageUseCase,
  UpdateMessageUseCase,
  getMediaType,
} from '@application/use-cases/message/message.use-case';

const receiver = { id: 4, firstName: 'Ibrahima', lastName: 'Fall' };

function messagesRepo(
  overrides: Partial<MessageRepository> = {},
): MessageRepository {
  return {
    findUserById: jest.fn().mockResolvedValue(receiver),
    findPartnerPreview: jest.fn().mockResolvedValue({
      id: 4,
      firstName: 'Ibrahima',
      lastName: 'Fall',
      photo: null,
      role: 'MERCHANT',
    }),
    create: jest.fn().mockResolvedValue({
      id: 11,
      senderId: 8,
      receiverId: 4,
      content: 'Salut',
    }),
    findConversationMessages: jest.fn().mockResolvedValue([]),
    findThreadMessages: jest.fn().mockResolvedValue([]),
    markReadByIds: jest.fn(),
    findById: jest.fn().mockResolvedValue({
      id: 11,
      senderId: 8,
      receiverId: 4,
      content: 'Salut',
      createdAt: new Date(),
    }),
    updateContent: jest.fn().mockResolvedValue({ id: 11, content: 'Maj' }),
    transformDeletedForEveryone: jest.fn(),
    markDeletedForSender: jest.fn(),
    markDeletedForReceiver: jest.fn(),
    markAsRead: jest.fn(),
    markAllFromPartnerAsRead: jest.fn().mockResolvedValue(2),
    findUnreadForUser: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as MessageRepository;
}

const fileStorage: FileStoragePort = {
  uploadProfilePhoto: jest.fn(),
  deleteProfilePhoto: jest.fn(),
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  uploadVideo: jest.fn(),
  deleteVideo: jest.fn(),
  uploadMessageMedia: jest.fn().mockResolvedValue('https://cdn/msg.jpg'),
  deleteMessageMedia: jest.fn(),
};

function notifications(): NotificationServicePort {
  return { create: jest.fn() };
}

describe('getMediaType', () => {
  it('détecte l’audio m4a', () => {
    expect(
      getMediaType({
        path: 'a.m4a',
        originalname: 'voix.m4a',
        mimetype: 'video/mp4',
        size: 10,
      }),
    ).toBe('audio');
  });
});

describe('SendMessageUseCase', () => {
  it('exige un destinataire', async () => {
    await expect(
      new SendMessageUseCase(
        messagesRepo(),
        fileStorage,
        notifications(),
      ).execute(8, { firstName: 'Awa', lastName: 'Diop' }, {}),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: { success: false, message: 'Le destinataire est obligatoire' },
    });
  });

  it('refuse un message à soi-même', async () => {
    await expect(
      new SendMessageUseCase(
        messagesRepo({ findUserById: jest.fn().mockResolvedValue({ id: 8 }) }),
        fileStorage,
        notifications(),
      ).execute(8, { firstName: 'Awa', lastName: 'Diop' }, {
        receiverId: 8,
        content: 'Hi',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: {
        success: false,
        message: 'Vous ne pouvez pas vous envoyer un message à vous-même',
      },
    });
  });

  it('envoie un message et notifie', async () => {
    const messages = messagesRepo();
    const notify = notifications();
    const result = await new SendMessageUseCase(
      messages,
      fileStorage,
      notify,
    ).execute(
      8,
      { firstName: 'Awa', lastName: 'Diop' },
      { receiverId: 4, content: 'Salut' },
    );

    expect(result).toMatchObject({
      success: true,
      message: 'Message envoyé avec succès',
    });
    expect(notify.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MESSAGE', priority: 2 }),
    );
  });
});

describe('GetConversationsUseCase', () => {
  it('groupe par partenaire et compte les non-lus', async () => {
    const now = new Date();
    const result = await new GetConversationsUseCase(
      messagesRepo({
        findConversationMessages: jest.fn().mockResolvedValue([
          {
            senderId: 4,
            receiverId: 8,
            content: 'Dernier',
            isRead: false,
            createdAt: now,
            sender: {
              id: 4,
              firstName: 'Ibrahima',
              lastName: 'Fall',
              photo: null,
              role: 'MERCHANT',
            },
            receiver: {
              id: 8,
              firstName: 'Awa',
              lastName: 'Diop',
              photo: null,
              role: 'CLIENT',
            },
          },
        ]),
      }),
    ).execute(8);

    expect(result.data[0]).toMatchObject({
      partnerId: 4,
      partnerName: 'Ibrahima Fall',
      lastMessage: 'Dernier',
      unreadCount: 1,
    });
  });
});

describe('GetMessagesUseCase', () => {
  it('refuse un partnerId invalide', async () => {
    await expect(
      new GetMessagesUseCase(messagesRepo()).execute(8, 'abc'),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: { success: false, message: 'ID de partenaire invalide' },
    });
  });
});

describe('UpdateMessageUseCase', () => {
  it('refuse si l’utilisateur n’est pas l’expéditeur', async () => {
    await expect(
      new UpdateMessageUseCase(messagesRepo()).execute(99, 11, 'Hack'),
    ).rejects.toMatchObject({
      statusCode: 403,
      body: {
        success: false,
        message: "Vous n'êtes pas autorisé à modifier ce message",
      },
    });
  });
});

describe('DeleteMessageUseCase', () => {
  it('refuse la suppression pour tous après 30 minutes', async () => {
    const useCase = new DeleteMessageUseCase(
      messagesRepo({
        findById: jest.fn().mockResolvedValue({
          id: 11,
          senderId: 8,
          receiverId: 4,
          createdAt: new Date(Date.now() - 31 * 60 * 1000),
        }),
      }),
      fileStorage,
    );

    await expect(useCase.execute(8, 11, 'true')).rejects.toMatchObject({
      statusCode: 403,
      body: {
        success: false,
        message: 'Vous ne pouvez pas supprimer ce message le temps à passer',
      },
    });
  });

  it('marque le message comme supprimé pour l’expéditeur', async () => {
    const messages = messagesRepo();
    const result = await new DeleteMessageUseCase(
      messages,
      fileStorage,
    ).execute(8, 11);

    expect(result.message).toBe('Message supprimé pour vous uniquement');
    expect(messages.markDeletedForSender).toHaveBeenCalledWith(11);
  });
});

describe('SearchMessagesUseCase', () => {
  it('exige un terme de recherche', async () => {
    await expect(
      new SearchMessagesUseCase(messagesRepo()).execute(8, undefined),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: { success: false, message: 'Le terme de recherche est obligatoire' },
    });
  });
});
