import { Injectable } from '@nestjs/common';
import type { SubscriptionRepository } from '@domain/repositories/subscription.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const userPreview = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    photo: true,
    role: true,
  },
} as const;

@Injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findSubscription(followerId: number, followingId: number) {
    return this.prisma.subscription.findFirst({
      where: { followerId, followingId },
    });
  }

  async deleteSubscription(id: number): Promise<void> {
    await this.prisma.subscription.delete({ where: { id } });
  }

  findUserPreview(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { firstName: true, lastName: true, photo: true },
    });
  }

  async createSubscription(
    followerId: number,
    followingId: number,
  ): Promise<void> {
    await this.prisma.subscription.create({
      data: { followerId, followingId },
    });
  }

  countFollowers(userId: number): Promise<number> {
    return this.prisma.subscription.count({
      where: { followingId: userId },
    });
  }

  async findFollowersPaged(userId: number, skip: number, take: number) {
    const where = { followingId: userId };
    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: { follower: userPreview },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { rows, total };
  }

  async findFollowingPaged(userId: number, skip: number, take: number) {
    const where = { followerId: userId };
    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: { following: userPreview },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { rows, total };
  }

  async findFollowingIds(followerId: number): Promise<number[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { followerId },
      select: { followingId: true },
    });
    return rows.map((row) => row.followingId);
  }

  findSuggestedUsers(excludeIds: number[], limit: number) {
    return this.prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photo: true,
        role: true,
        _count: { select: { followers: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
