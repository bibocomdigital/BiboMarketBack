export const BADGE_REPOSITORY = Symbol('BADGE_REPOSITORY');

export type BadgeStatusValue = 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED';
export type StoryMediaValue = 'PHOTO' | 'VIDEO';
export type StoryStatusValue = 'PUBLISHED' | 'REJECTED';

export interface BadgeSettingsRecord {
  priceCfa: number;
  supplierPriceCfa: number;
  durationDays: number;
  graceDays: number;
  saleOpen: boolean;
}

export interface BadgeSubscriptionRecord {
  id: number;
  userId: number;
  status: BadgeStatusValue;
  priceCfa: number;
  startsAt: string | null;
  endsAt: string | null;
  graceEndsAt: string | null;
  paydunyaToken: string | null;
  paidAt: string | null;
}

export interface BadgeUserRecord {
  id: number;
  role: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface StoryRecord {
  id: number;
  userId: number;
  mediaType: StoryMediaValue;
  mediaPath: string;
  durationSeconds: number | null;
  status: StoryStatusValue;
  createdAt: string;
  expiresAt: string;
  author: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    photo: string | null;
    role: string;
    shop: { id: number; name: string; logo: string | null } | null;
  };
}

export interface BadgeRepository {
  getSettings(): Promise<BadgeSettingsRecord>;
  updateSettings(
    input: Partial<BadgeSettingsRecord>,
  ): Promise<BadgeSettingsRecord>;
  findUser(userId: number): Promise<BadgeUserRecord | null>;
  findLatest(userId: number): Promise<BadgeSubscriptionRecord | null>;
  findActive(userId: number): Promise<BadgeSubscriptionRecord | null>;
  createPending(userId: number, priceCfa: number): Promise<BadgeSubscriptionRecord>;
  attachInvoice(id: number, token: string): Promise<void>;
  findByToken(token: string): Promise<BadgeSubscriptionRecord | null>;
  findById(id: number): Promise<BadgeSubscriptionRecord | null>;
  activate(
    id: number,
    dates: { startsAt: Date; endsAt: Date; graceEndsAt: Date; paidAt: Date },
  ): Promise<BadgeSubscriptionRecord>;
  expireOthers(userId: number, keepId: number): Promise<void>;
  markExpired(id: number): Promise<void>;
  syncShopBadge(userId: number, active: boolean): Promise<void>;
  claimReminder(subscriptionId: number, kind: string): Promise<boolean>;
  listActive(): Promise<BadgeSubscriptionRecord[]>;
  hasActiveBadge(userId: number): Promise<boolean>;
  createStory(input: {
    userId: number;
    mediaType: StoryMediaValue;
    mediaPath: string;
    durationSeconds: number | null;
    expiresAt: Date;
  }): Promise<StoryRecord>;
  listPublicStories(): Promise<StoryRecord[]>;
  listModerationStories(): Promise<StoryRecord[]>;
  findStory(id: number): Promise<StoryRecord | null>;
  setStoryStatus(id: number, status: StoryStatusValue): Promise<StoryRecord>;
  deleteStory(id: number): Promise<void>;
}
