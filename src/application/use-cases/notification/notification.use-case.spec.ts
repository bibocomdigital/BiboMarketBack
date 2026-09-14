import {
  DeleteAllNotificationsUseCase,
  DeleteNotificationUseCase,
  GetUserNotificationsUseCase,
  MarkAllNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from './notification.use-case';
import type { NotificationRepository } from '@domain/repositories/notification.repository';

const sample = {
  id: 7,
  userId: 8,
  type: 'FOLLOW',
  message: 'Awa vous suit',
  isRead: false,
};

function notificationsRepo(
  overrides: Partial<NotificationRepository> = {},
): NotificationRepository {
  return {
    findByUserId: jest.fn().mockResolvedValue([sample]),
    markAsRead: jest.fn().mockResolvedValue({ ...sample, isRead: true }),
    markAllAsRead: jest.fn(),
    deleteById: jest.fn(),
    deleteAllByUserId: jest.fn(),
    ...overrides,
  } as unknown as NotificationRepository;
}

describe('GetUserNotificationsUseCase', () => {
  it('renvoie le tableau de notifications', async () => {
    const result = await new GetUserNotificationsUseCase(
      notificationsRepo(),
    ).execute(8);

    expect(result).toEqual([sample]);
  });
});

describe('MarkNotificationAsReadUseCase', () => {
  it('marque une notification comme lue', async () => {
    const notifications = notificationsRepo();
    const result = await new MarkNotificationAsReadUseCase(
      notifications,
    ).execute('7');

    expect(notifications.markAsRead).toHaveBeenCalledWith(7);
    expect(result).toMatchObject({ id: 7, isRead: true });
  });

  it('renvoie le contrat Express global en cas d’erreur', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const useCase = new MarkNotificationAsReadUseCase(
      notificationsRepo({
        markAsRead: jest.fn().mockRejectedValue(new Error('boom')),
      }),
    );

    await expect(useCase.execute(99)).rejects.toMatchObject({
      statusCode: 500,
      body: {
        status: 'error',
        message: 'Something went wrong!',
        error: 'Internal Server Error',
      },
    });

    process.env.NODE_ENV = previous;
  });
});

describe('MarkAllNotificationsAsReadUseCase', () => {
  it('renvoie le message Express', async () => {
    const result = await new MarkAllNotificationsAsReadUseCase(
      notificationsRepo(),
    ).execute(8);

    expect(result).toEqual({
      message: 'Toutes les notifications ont été marquées comme lues.',
    });
  });
});

describe('DeleteNotificationUseCase', () => {
  it('renvoie le message Express', async () => {
    const notifications = notificationsRepo();
    const result = await new DeleteNotificationUseCase(notifications).execute(
      '7',
    );

    expect(notifications.deleteById).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      message: 'Notification supprimée avec succès.',
    });
  });
});

describe('DeleteAllNotificationsUseCase', () => {
  it('renvoie le message Express', async () => {
    const notifications = notificationsRepo();
    const result = await new DeleteAllNotificationsUseCase(
      notifications,
    ).execute(8);

    expect(notifications.deleteAllByUserId).toHaveBeenCalledWith(8);
    expect(result).toEqual({
      message: 'Toutes les notifications ont été supprimées.',
    });
  });
});
