import { Injectable } from '@nestjs/common';
import type { LikeRepository } from '@domain/repositories/like.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type { LikeType } from '../../generated/prisma/enums';

const userPreview = {
  select: { id: true, firstName: true, lastName: true, photo: true },
} as const;

@Injectable()
export class PrismaLikeRepository implements LikeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublishedProduct(id: number) {
    return this.prisma.product.findFirst({
      where: { id, status: 'PUBLISHED' },
    });
  }

  findProductById(id: number) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  findReaction(productId: number, userId: number, type?: string) {
    return this.prisma.productLike.findFirst({
      where: {
        productId,
        userId,
        ...(type ? { type: type as LikeType } : {}),
      },
    });
  }

  async deleteReaction(id: number): Promise<void> {
    await this.prisma.productLike.delete({ where: { id } });
  }

  async createReaction(data: {
    productId: number;
    userId: number;
    type: string;
  }): Promise<void> {
    await this.prisma.productLike.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        type: data.type as LikeType,
      },
    });
  }

  async incrementLikesCount(productId: number, by = 1): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { likesCount: { increment: by } },
    });
  }

  async decrementLikesCount(productId: number): Promise<void> {
    await this.prisma.product.updateMany({
      where: { id: productId, likesCount: { gt: 0 } },
      data: { likesCount: { decrement: 1 } },
    });
  }

  countByType(productId: number, type: string): Promise<number> {
    return this.prisma.productLike.count({
      where: { productId, type: type as LikeType },
    });
  }

  findUserNames(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
  }

  async findReactionsPaged(
    productId: number,
    type: string,
    page: number,
    limit: number,
  ) {
    const where = { productId, type: type as LikeType };
    const [likes, total] = await Promise.all([
      this.prisma.productLike.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: userPreview },
      }),
      this.prisma.productLike.count({ where }),
    ]);
    return { likes, total };
  }
}
