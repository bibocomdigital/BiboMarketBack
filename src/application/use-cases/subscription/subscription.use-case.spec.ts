import type { SubscriptionRepository } from '@domain/repositories/subscription.repository';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import {
  CheckIfFollowingUseCase,
  GetSuggestedUsersUseCase,
  GetUserFollowersUseCase,
  ToggleFollowUseCase,
} from './subscription.use-case';

const userToFollow = {
  id: 4,
  firstName: 'Ibrahima',
  lastName: 'Fall',
  photo: null,
};

function subscriptionsRepo(
  overrides: Partial<SubscriptionRepository> = {},
): SubscriptionRepository {
  return {
    findUserById: jest.fn().mockResolvedValue(userToFollow),
    findSubscription: jest.fn().mockResolvedValue(null),
    deleteSubscription: jest.fn(),
    findUserPreview: jest.fn().mockResolvedValue({
      firstName: 'Awa',
      lastName: 'Diop',
      photo: null,
    }),
    createSubscription: jest.fn(),
    countFollowers: jest.fn().mockResolvedValue(3),
    findFollowersPaged: jest.fn().mockResolvedValue({
      rows: [
        {
          createdAt: new Date('2026-01-01'),
          follower: {
            id: 8,
            firstName: 'Awa',
            lastName: 'Diop',
            photo: null,
            role: 'CLIENT',
          },
        },
      ],
      total: 1,
    }),
    findFollowingPaged: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    findFollowingIds: jest.fn().mockResolvedValue([4]),
    findSuggestedUsers: jest.fn().mockResolvedValue([
      {
        id: 9,
        firstName: 'Fatou',
        lastName: 'Sow',
        photo: null,
        role: 'MERCHANT',
        _count: { followers: 12 },
      },
    ]),
    ...overrides,
  } as unknown as SubscriptionRepository;
}

function notifications(): NotificationServicePort {
  return { create: jest.fn() };
}

describe('ToggleFollowUseCase', () => {
  it('refuse un utilisateur introuvable', async () => {
    const useCase = new ToggleFollowUseCase(
      subscriptionsRepo({ findUserById: jest.fn().mockResolvedValue(null) }),
      notifications(),
    );

    await expect(useCase.execute(8, 4)).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Utilisateur introuvable' },
    });
  });

  it('refuse de se suivre soi-même', async () => {
    const useCase = new ToggleFollowUseCase(
      subscriptionsRepo(),
      notifications(),
    );

    await expect(useCase.execute(4, 4)).rejects.toMatchObject({
      statusCode: 400,
      body: { message: 'Vous ne pouvez pas vous suivre vous-même' },
    });
  });

  it('crée un abonnement et notifie', async () => {
    const subscriptions = subscriptionsRepo();
    const notify = notifications();
    const result = await new ToggleFollowUseCase(
      subscriptions,
      notify,
    ).execute(8, 4);

    expect(result).toMatchObject({
      message: 'Vous suivez maintenant cet utilisateur',
      action: 'followed',
      followerCount: 3,
    });
    expect(subscriptions.createSubscription).toHaveBeenCalledWith(8, 4);
    expect(notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 4,
        type: 'FOLLOW',
        priority: 2,
      }),
    );
  });

  it('retire un abonnement existant', async () => {
    const subscriptions = subscriptionsRepo({
      findSubscription: jest.fn().mockResolvedValue({ id: 15 }),
    });
    const result = await new ToggleFollowUseCase(
      subscriptions,
      notifications(),
    ).execute(8, 4);

    expect(result).toMatchObject({
      message: 'Vous ne suivez plus cet utilisateur',
      action: 'unfollowed',
    });
    expect(subscriptions.deleteSubscription).toHaveBeenCalledWith(15);
  });
});

describe('GetUserFollowersUseCase', () => {
  it('mappe les abonnés et la pagination Express', async () => {
    const result = await new GetUserFollowersUseCase(
      subscriptionsRepo(),
    ).execute(4, 1, 20);

    expect(result.followers[0]).toMatchObject({
      id: 8,
      firstName: 'Awa',
      role: 'CLIENT',
    });
    expect(result.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      pages: 1,
    });
  });
});

describe('CheckIfFollowingUseCase', () => {
  it('renvoie isFollowing false', async () => {
    const result = await new CheckIfFollowingUseCase(
      subscriptionsRepo(),
    ).execute(8, 4);

    expect(result).toEqual({ isFollowing: false });
  });
});

describe('GetSuggestedUsersUseCase', () => {
  it('exclut l’utilisateur courant et mappe followerCount', async () => {
    const subscriptions = subscriptionsRepo();
    const result = await new GetSuggestedUsersUseCase(subscriptions).execute(
      8,
      10,
    );

    expect(subscriptions.findSuggestedUsers).toHaveBeenCalledWith([4, 8], 10);
    expect(result.suggestions[0]).toEqual({
      id: 9,
      firstName: 'Fatou',
      lastName: 'Sow',
      photo: null,
      role: 'MERCHANT',
      followerCount: 12,
    });
  });
});
