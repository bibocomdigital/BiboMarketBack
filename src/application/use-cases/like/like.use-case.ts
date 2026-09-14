import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  LIKE_REPOSITORY,
  type LikeRepository,
} from '@domain/repositories/like.repository';
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

@Injectable()
export class ToggleLikeUseCase {
  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likes: LikeRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(userId: number, productId: unknown) {
    try {
      const parsedProductId = parseInt(String(productId), 10);
      const product = await this.likes.findPublishedProduct(parsedProductId);

      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé ou non publié',
        });
      }

      const existingLike = await this.likes.findReaction(
        parsedProductId,
        userId,
        'LIKE',
      );

      let message: string;
      let action: string;

      if (existingLike) {
        await this.likes.deleteReaction(existingLike.id);
        await this.likes.decrementLikesCount(parsedProductId);
        message = "Vous n'aimez plus ce produit";
        action = 'unliked';
      } else {
        const existingDislike = await this.likes.findReaction(
          parsedProductId,
          userId,
          'DISLIKE',
        );

        if (existingDislike) {
          await this.likes.deleteReaction(existingDislike.id);
          await this.likes.incrementLikesCount(parsedProductId);
        }

        await this.likes.createReaction({
          productId: parsedProductId,
          userId,
          type: 'LIKE',
        });
        await this.likes.incrementLikesCount(parsedProductId);

        const likedBy = await this.likes.findUserNames(userId);

        if (product.userId !== userId) {
          await this.notifications.create({
            userId: product.userId,
            type: 'PRODUCT_LIKE',
            message: `${likedBy!.firstName} ${likedBy!.lastName} a aimé votre produit "${product.name}"`,
            actionUrl: `/products/${productId}`,
            resourceId: parsedProductId,
            resourceType: 'Product',
            priority: 1,
          });
        }

        message = 'Vous aimez ce produit';
        action = 'liked';
      }

      const [likesCount, dislikesCount] = await Promise.all([
        this.likes.countByType(parsedProductId, 'LIKE'),
        this.likes.countByType(parsedProductId, 'DISLIKE'),
      ]);

      return { message, action, likesCount, dislikesCount };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        "Une erreur est survenue lors de l'interaction avec le like",
        error,
      );
    }
  }
}

@Injectable()
export class ToggleDislikeUseCase {
  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likes: LikeRepository,
  ) {}

  async execute(userId: number, productId: unknown) {
    try {
      const parsedProductId = parseInt(String(productId), 10);
      const product = await this.likes.findPublishedProduct(parsedProductId);

      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé ou non publié',
        });
      }

      const existingDislike = await this.likes.findReaction(
        parsedProductId,
        userId,
        'DISLIKE',
      );

      let message: string;
      let action: string;

      if (existingDislike) {
        await this.likes.deleteReaction(existingDislike.id);
        await this.likes.incrementLikesCount(parsedProductId);
        message = 'Vous avez annulé votre dislike';
        action = 'undisliked';
      } else {
        const existingLike = await this.likes.findReaction(
          parsedProductId,
          userId,
          'LIKE',
        );

        if (existingLike) {
          await this.likes.deleteReaction(existingLike.id);
          await this.likes.decrementLikesCount(parsedProductId);
        }

        await this.likes.createReaction({
          productId: parsedProductId,
          userId,
          type: 'DISLIKE',
        });
        await this.likes.decrementLikesCount(parsedProductId);

        message = "Vous n'aimez pas ce produit";
        action = 'disliked';
      }

      const [likesCount, dislikesCount] = await Promise.all([
        this.likes.countByType(parsedProductId, 'LIKE'),
        this.likes.countByType(parsedProductId, 'DISLIKE'),
      ]);

      return { message, action, likesCount, dislikesCount };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        "Une erreur est survenue lors de l'interaction avec le dislike",
        error,
      );
    }
  }
}

@Injectable()
export class GetProductLikesUseCase {
  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likes: LikeRepository,
  ) {}

  async execute(
    productId: unknown,
    page: unknown = 1,
    limit: unknown = 10,
    type: unknown = 'LIKE',
  ) {
    try {
      const parsedProductId = parseInt(String(productId), 10);
      const parsedPage = parseInt(String(page), 10);
      const parsedLimit = parseInt(String(limit), 10);
      const parsedType = String(type).toUpperCase();
      const product = await this.likes.findProductById(parsedProductId);

      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé',
        });
      }

      const { likes, total } = await this.likes.findReactionsPaged(
        parsedProductId,
        parsedType,
        parsedPage,
        parsedLimit,
      );

      return {
        likes,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        'Une erreur est survenue lors de la récupération des likes',
        error,
      );
    }
  }
}

@Injectable()
export class GetUserReactionUseCase {
  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likes: LikeRepository,
  ) {}

  async execute(userId: number, productId: unknown) {
    try {
      const parsedProductId = parseInt(String(productId), 10);
      const product = await this.likes.findProductById(parsedProductId);

      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé',
        });
      }

      const reaction = await this.likes.findReaction(parsedProductId, userId);

      if (!reaction) {
        return { hasReaction: false, type: null };
      }

      return { hasReaction: true, type: reaction.type };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        'Une erreur est survenue lors de la vérification de la réaction',
        error,
      );
    }
  }
}
