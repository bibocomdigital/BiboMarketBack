import { Injectable } from '@nestjs/common';
import type {
  BadgeRepository,
  BadgeSettingsRecord,
  BadgeSubscriptionRecord,
  BadgeUserRecord,
  StoryMediaValue,
  StoryRecord,
  StoryStatusValue,
} from '@domain/repositories/badge.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class PrismaBadgeRepository implements BadgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<BadgeSettingsRecord> {
    const existing = await this.prisma.badgeSettings.findUnique({
      where: { id: 1 },
    });
    const row =
      existing ??
      (await this.prisma.badgeSettings.create({
        data: {
          id: 1,
          priceCfa: 12000,
          supplierPriceCfa: 8000,
          durationDays: 365,
          graceDays: 7,
          saleOpen: true,
        },
      }));
    return {
      priceCfa: row.priceCfa,
      supplierPriceCfa: row.supplierPriceCfa,
      durationDays: row.durationDays,
      graceDays: row.graceDays,
      saleOpen: row.saleOpen,
    };
  }

  async updateSettings(
    input: Partial<BadgeSettingsRecord>,
  ): Promise<BadgeSettingsRecord> {
    await this.getSettings();
    const row = await this.prisma.badgeSettings.update({
      where: { id: 1 },
      data: input,
    });
    return {
      priceCfa: row.priceCfa,
      supplierPriceCfa: row.supplierPriceCfa,
      durationDays: row.durationDays,
      graceDays: row.graceDays,
      saleOpen: row.saleOpen,
    };
  }

  async findUser(userId: number): Promise<BadgeUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) return null;
    return { ...user, role: String(user.role) };
  }

  async findLatest(userId: number): Promise<BadgeSubscriptionRecord | null> {
    const row = await this.prisma.badgeSubscription.findFirst({
      where: { userId },
      orderBy: { id: 'desc' },
    });
    return row ? this.mapSubscription(row) : null;
  }

  async findActive(userId: number): Promise<BadgeSubscriptionRecord | null> {
    const row = await this.prisma.badgeSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { id: 'desc' },
    });
    return row ? this.mapSubscription(row) : null;
  }

  async createPending(
    userId: number,
    priceCfa: number,
  ): Promise<BadgeSubscriptionRecord> {
    const row = await this.prisma.badgeSubscription.create({
      data: { userId, priceCfa, status: 'PENDING_PAYMENT' },
    });
    return this.mapSubscription(row);
  }

  async attachInvoice(id: number, token: string): Promise<void> {
    await this.prisma.badgeSubscription.update({
      where: { id },
      data: { paydunyaToken: token },
    });
  }

  async findByToken(token: string): Promise<BadgeSubscriptionRecord | null> {
    const row = await this.prisma.badgeSubscription.findUnique({
      where: { paydunyaToken: token },
    });
    return row ? this.mapSubscription(row) : null;
  }

  async findById(id: number): Promise<BadgeSubscriptionRecord | null> {
    const row = await this.prisma.badgeSubscription.findUnique({
      where: { id },
    });
    return row ? this.mapSubscription(row) : null;
  }

  async activate(
    id: number,
    dates: { startsAt: Date; endsAt: Date; graceEndsAt: Date; paidAt: Date },
  ): Promise<BadgeSubscriptionRecord> {
    const row = await this.prisma.badgeSubscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startsAt: dates.startsAt,
        endsAt: dates.endsAt,
        graceEndsAt: dates.graceEndsAt,
        paidAt: dates.paidAt,
      },
    });
    return this.mapSubscription(row);
  }

  async expireOthers(userId: number, keepId: number): Promise<void> {
    await this.prisma.badgeSubscription.updateMany({
      where: { userId, status: 'ACTIVE', id: { not: keepId } },
      data: { status: 'EXPIRED' },
    });
  }

  async markExpired(id: number): Promise<void> {
    await this.prisma.badgeSubscription.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });
  }

  async syncShopBadge(userId: number, active: boolean): Promise<void> {
    await this.prisma.shop.updateMany({
      where: { userId },
      data: { verifiedBadge: active },
    });
  }

  async claimReminder(subscriptionId: number, kind: string): Promise<boolean> {
    try {
      await this.prisma.badgeReminder.create({
        data: { subscriptionId, kind },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async listActive(): Promise<BadgeSubscriptionRecord[]> {
    const rows = await this.prisma.badgeSubscription.findMany({
      where: { status: 'ACTIVE' },
    });
    return rows.map((row) => this.mapSubscription(row));
  }

  async hasActiveBadge(userId: number): Promise<boolean> {
    const row = await this.prisma.badgeSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        graceEndsAt: { gt: new Date() },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async createStory(input: {
    userId: number;
    mediaType: StoryMediaValue;
    mediaPath: string;
    durationSeconds: number | null;
    expiresAt: Date;
  }): Promise<StoryRecord> {
    const row = await this.prisma.story.create({
      data: input,
      include: this.storyInclude(),
    });
    return this.mapStory(row);
  }

  async listPublicStories(): Promise<StoryRecord[]> {
    const rows = await this.prisma.story.findMany({
      where: { status: 'PUBLISHED', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: this.storyInclude(),
    });
    return rows.map((row) => this.mapStory(row));
  }

  async listModerationStories(): Promise<StoryRecord[]> {
    const rows = await this.prisma.story.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: this.storyInclude(),
    });
    return rows.map((row) => this.mapStory(row));
  }

  async findStory(id: number): Promise<StoryRecord | null> {
    const row = await this.prisma.story.findUnique({
      where: { id },
      include: this.storyInclude(),
    });
    return row ? this.mapStory(row) : null;
  }

  async setStoryStatus(
    id: number,
    status: StoryStatusValue,
  ): Promise<StoryRecord> {
    const row = await this.prisma.story.update({
      where: { id },
      data: { status },
      include: this.storyInclude(),
    });
    return this.mapStory(row);
  }

  async deleteStory(id: number): Promise<void> {
    await this.prisma.story.delete({ where: { id } });
  }

  private storyInclude() {
    return {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photo: true,
          role: true,
          shop: { select: { id: true, name: true, logo: true } },
        },
      },
    } as const;
  }

  private mapSubscription(row: {
    id: number;
    userId: number;
    status: string;
    priceCfa: number;
    startsAt: Date | null;
    endsAt: Date | null;
    graceEndsAt: Date | null;
    paydunyaToken: string | null;
    paidAt: Date | null;
  }): BadgeSubscriptionRecord {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status as BadgeSubscriptionRecord['status'],
      priceCfa: row.priceCfa,
      startsAt: iso(row.startsAt),
      endsAt: iso(row.endsAt),
      graceEndsAt: iso(row.graceEndsAt),
      paydunyaToken: row.paydunyaToken,
      paidAt: iso(row.paidAt),
    };
  }

  private mapStory(row: {
    id: number;
    userId: number;
    mediaType: string;
    mediaPath: string;
    durationSeconds: number | null;
    status: string;
    createdAt: Date;
    expiresAt: Date;
    user: {
      id: number;
      firstName: string | null;
      lastName: string | null;
      photo: string | null;
      role: string;
      shop: { id: number; name: string; logo: string | null } | null;
    };
  }): StoryRecord {
    return {
      id: row.id,
      userId: row.userId,
      mediaType: row.mediaType as StoryRecord['mediaType'],
      mediaPath: row.mediaPath,
      durationSeconds: row.durationSeconds,
      status: row.status as StoryRecord['status'],
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      author: {
        id: row.user.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        photo: row.user.photo,
        role: String(row.user.role),
        shop: row.user.shop,
      },
    };
  }
}
