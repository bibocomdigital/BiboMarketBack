import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  SUBSCRIPTION_REPOSITORY,
  type SubscriptionRepository,
} from '@domain/repositories/subscription.repository';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function raw500(message: string, error: unknown) {
  return ExpressContractException.raw(500, {
    message,
    error: errorMessage(error),
  });
}

function pageLimit(page: unknown, limit: unknown, defaultLimit: number) {
  return {
    page: parseInt(String(page), 10) || 1,
    limit: parseInt(String(limit), 10) || defaultLimit,
  };
}

@Injectable()
export class ToggleFollowUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(followerId: number, userId: unknown) {
    try {
      const parsedUserId = parseInt(String(userId), 10);
      const userToFollow = await this.subscriptions.findUserById(parsedUserId);

      if (!userToFollow) {
        throw ExpressContractException.raw(404, {
          message: 'Utilisateur introuvable',
        });
      }

      if (parsedUserId === followerId) {
        throw ExpressContractException.raw(400, {
          message: 'Vous ne pouvez pas vous suivre vous-même',
        });
      }

      const existing = await this.subscriptions.findSubscription(
        followerId,
        parsedUserId,
      );

      let message: string;
      let action: string;

      if (existing) {
        await this.subscriptions.deleteSubscription(existing.id);
        message = 'Vous ne suivez plus cet utilisateur';
        action = 'unfollowed';
      } else {
        const follower = await this.subscriptions.findUserPreview(followerId);

        await this.subscriptions.createSubscription(followerId, parsedUserId);

        await this.notifications.create({
          userId: parsedUserId,
          type: 'FOLLOW',
          message: `${follower!.firstName} ${follower!.lastName} a commencé à vous suivre. Vous pouvez également le suivre en retour.`,
          actionUrl: `/profil/${followerId}`,
          resourceId: followerId,
          resourceType: 'User',
          priority: 2,
        });

        message = 'Vous suivez maintenant cet utilisateur';
        action = 'followed';
      }

      const followerCount =
        await this.subscriptions.countFollowers(parsedUserId);

      return {
        message,
        action,
        followerCount,
        userToFollow: {
          id: userToFollow.id,
          firstName: userToFollow.firstName,
          lastName: userToFollow.lastName,
          photo: userToFollow.photo,
        },
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        "Une erreur est survenue lors de la gestion de l'abonnement",
        error,
      );
    }
  }
}

@Injectable()
export class GetUserFollowersUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  async execute(userId: unknown, page: unknown = 1, limit: unknown = 20) {
    try {
      const parsedUserId = parseInt(String(userId), 10);
      const paging = pageLimit(page, limit, 20);
      const { rows, total } = await this.subscriptions.findFollowersPaged(
        parsedUserId,
        (paging.page - 1) * paging.limit,
        paging.limit,
      );

      return {
        followers: rows.map((row) => ({
          id: row.follower.id,
          firstName: row.follower.firstName,
          lastName: row.follower.lastName,
          photo: row.follower.photo,
          role: row.follower.role,
          followedAt: row.createdAt,
        })),
        pagination: {
          total,
          page: paging.page,
          limit: paging.limit,
          pages: Math.ceil(total / paging.limit),
        },
      };
    } catch (error) {
      throw raw500(
        'Une erreur est survenue lors de la récupération des abonnés',
        error,
      );
    }
  }
}

@Injectable()
export class GetUserFollowingUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  async execute(userId: unknown, page: unknown = 1, limit: unknown = 20) {
    try {
      const parsedUserId = parseInt(String(userId), 10);
      const paging = pageLimit(page, limit, 20);
      const { rows, total } = await this.subscriptions.findFollowingPaged(
        parsedUserId,
        (paging.page - 1) * paging.limit,
        paging.limit,
      );

      return {
        following: rows.map((row) => ({
          id: row.following.id,
          firstName: row.following.firstName,
          lastName: row.following.lastName,
          photo: row.following.photo,
          role: row.following.role,
          followedAt: row.createdAt,
        })),
        pagination: {
          total,
          page: paging.page,
          limit: paging.limit,
          pages: Math.ceil(total / paging.limit),
        },
      };
    } catch (error) {
      throw raw500(
        'Une erreur est survenue lors de la récupération des abonnements',
        error,
      );
    }
  }
}

@Injectable()
export class CheckIfFollowingUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  async execute(followerId: number, userId: unknown) {
    try {
      const subscription = await this.subscriptions.findSubscription(
        followerId,
        parseInt(String(userId), 10),
      );

      return { isFollowing: !!subscription };
    } catch (error) {
      throw raw500(
        "Une erreur est survenue lors de la vérification d'abonnement",
        error,
      );
    }
  }
}

@Injectable()
export class GetSuggestedUsersUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  async execute(userId: number, limit: unknown = 10) {
    try {
      const parsedLimit = parseInt(String(limit), 10) || 10;
      const followingIds = await this.subscriptions.findFollowingIds(userId);
      followingIds.push(userId);

      const suggestedUsers = await this.subscriptions.findSuggestedUsers(
        followingIds,
        parsedLimit,
      );

      return {
        suggestions: suggestedUsers.map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          role: user.role,
          followerCount: user._count.followers,
        })),
      };
    } catch (error) {
      throw raw500(
        'Une erreur est survenue lors de la récupération des suggestions',
        error,
      );
    }
  }
}
