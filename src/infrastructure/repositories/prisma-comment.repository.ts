import { Injectable } from '@nestjs/common';
import type { CommentRepository } from '@domain/repositories/comment.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const userPreview = {
  select: { id: true, firstName: true, lastName: true, photo: true },
} as const;

@Injectable()
export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublishedProduct(id: number) {
    return this.prisma.product.findFirst({
      where: { id, status: 'PUBLISHED' },
    });
  }

  findProductById(id: number) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  createComment(data: { productId: number; userId: number; comment: string }) {
    return this.prisma.productComment.create({ data });
  }

  async incrementCommentsCount(productId: number): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { commentsCount: { increment: 1 } },
    });
  }

  async decrementCommentsCount(productId: number): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { commentsCount: { decrement: 1 } },
    });
  }

  findCommentWithUser(id: number) {
    return this.prisma.productComment.findUnique({
      where: { id },
      include: { user: userPreview },
    });
  }

  async findCommentsPaged(productId: number, page: number, limit: number) {
    const where = { productId };
    const [comments, total] = await Promise.all([
      this.prisma.productComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: userPreview,
          replies: {
            include: { user: userPreview },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.productComment.count({ where }),
    ]);
    return { comments, total };
  }

  findCommentWithProduct(id: number) {
    return this.prisma.productComment.findUnique({
      where: { id },
      include: { product: true },
    });
  }

  findCommentById(id: number) {
    return this.prisma.productComment.findUnique({ where: { id } });
  }

  createReply(data: { commentId: number; userId: number; reply: string }) {
    return this.prisma.commentReply.create({ data });
  }

  findReplyWithUser(id: number) {
    return this.prisma.commentReply.findUnique({
      where: { id },
      include: { user: userPreview },
    });
  }

  async deleteRepliesByCommentId(commentId: number): Promise<void> {
    await this.prisma.commentReply.deleteMany({ where: { commentId } });
  }

  async deleteComment(id: number): Promise<void> {
    await this.prisma.productComment.delete({ where: { id } });
  }

  findReplyWithCommentAndProduct(id: number) {
    return this.prisma.commentReply.findUnique({
      where: { id },
      include: { comment: { include: { product: true } } },
    });
  }

  async deleteReply(id: number): Promise<void> {
    await this.prisma.commentReply.delete({ where: { id } });
  }

  updateComment(id: number, comment: string) {
    return this.prisma.productComment.update({
      where: { id },
      data: { comment, updatedAt: new Date() },
      include: { user: userPreview },
    });
  }
}
