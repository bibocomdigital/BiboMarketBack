export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');

export interface SubscriptionRepository {
  findUserById(id: number): Promise<any>;
  findSubscription(
    followerId: number,
    followingId: number,
  ): Promise<{ id: number } | null>;
  deleteSubscription(id: number): Promise<void>;
  findUserPreview(id: number): Promise<{
    firstName: string | null;
    lastName: string | null;
    photo: string | null;
  } | null>;
  createSubscription(followerId: number, followingId: number): Promise<void>;
  countFollowers(userId: number): Promise<number>;
  findFollowersPaged(
    userId: number,
    skip: number,
    take: number,
  ): Promise<{ rows: any[]; total: number }>;
  findFollowingPaged(
    userId: number,
    skip: number,
    take: number,
  ): Promise<{ rows: any[]; total: number }>;
  findFollowingIds(followerId: number): Promise<number[]>;
  findSuggestedUsers(excludeIds: number[], limit: number): Promise<any[]>;
}
