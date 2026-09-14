import type { MessageRepository } from '@domain/repositories/message.repository';
import {
  MarkSocketMessageReadUseCase,
  SendSocketMessageUseCase,
} from '@application/use-cases/socket/socket.use-case';

function messagesRepo(
  overrides: Partial<MessageRepository> = {},
): MessageRepository {
  return {
    create: jest.fn().mockResolvedValue({
      id: 11,
      senderId: 8,
      receiverId: 4,
      content: 'Salut',
    }),
    findById: jest.fn().mockResolvedValue({
      id: 11,
      senderId: 8,
      receiverId: 4,
    }),
    markAsRead: jest.fn().mockResolvedValue({
      id: 11,
      isRead: true,
    }),
    ...overrides,
  } as unknown as MessageRepository;
}

describe('SendSocketMessageUseCase', () => {
  it('crée un message texte sans média', async () => {
    const messages = messagesRepo();
    const result = await new SendSocketMessageUseCase(messages).execute(
      8,
      '4',
      'Salut',
    );

    expect(messages.create).toHaveBeenCalledWith({
      senderId: 8,
      receiverId: 4,
      content: 'Salut',
      mediaUrl: null,
      mediaType: null,
      isRead: false,
    });
    expect(result.id).toBe(11);
  });
});

describe('MarkSocketMessageReadUseCase', () => {
  it('ignore si le destinataire ne correspond pas', async () => {
    const result = await new MarkSocketMessageReadUseCase(
      messagesRepo(),
    ).execute(99, 11);

    expect(result).toBeNull();
  });

  it('marque comme lu et renvoie l’expéditeur', async () => {
    const messages = messagesRepo();
    const result = await new MarkSocketMessageReadUseCase(messages).execute(
      4,
      11,
    );

    expect(messages.markAsRead).toHaveBeenCalledWith(11);
    expect(result).toMatchObject({ senderId: 8 });
  });
});
