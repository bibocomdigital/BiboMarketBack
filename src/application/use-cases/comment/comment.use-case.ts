import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  COMMENT_REPOSITORY,
  type CommentRepository,
} from '@domain/repositories/comment.repository';
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
export class AddCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(userId: number, productId: unknown, comment: unknown) {
    try {
      const parsedProductId = parseInt(String(productId), 10);
      const product = await this.comments.findPublishedProduct(parsedProductId);

      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé ou non publié',
        });
      }

      const created = await this.comments.createComment({
        productId: parsedProductId,
        userId,
        comment: comment as string,
      });

      await this.comments.incrementCommentsCount(parsedProductId);

      if (product.userId !== userId) {
        await this.notifications.create({
          userId: product.userId,
          type: 'PRODUCT',
          message: `Un utilisateur a commenté votre produit "${product.name}"`,
          actionUrl: `/products/${productId}#comments`,
          resourceId: parsedProductId,
          resourceType: 'Product',
        });
      }

      const commentWithUser = await this.comments.findCommentWithUser(
        created.id,
      );

      return {
        message: 'Commentaire ajouté avec succès',
        comment: commentWithUser,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        "Une erreur est survenue lors de l'ajout du commentaire",
        error,
      );
    }
  }
}

@Injectable()
export class GetProductCommentsUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
  ) {}

  async execute(productId: unknown, page: unknown = 1, limit: unknown = 10) {
    try {
      const parsedProductId = parseInt(String(productId), 10);
      const parsedPage = parseInt(String(page), 10);
      const parsedLimit = parseInt(String(limit), 10);
      const product = await this.comments.findProductById(parsedProductId);

      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé',
        });
      }

      const { comments, total } = await this.comments.findCommentsPaged(
        parsedProductId,
        parsedPage,
        parsedLimit,
      );

      return {
        comments,
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
        'Une erreur est survenue lors de la récupération des commentaires',
        error,
      );
    }
  }
}

@Injectable()
export class ReplyToCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(userId: number, commentId: unknown, reply: unknown) {
    try {
      const parsedCommentId = parseInt(String(commentId), 10);
      const comment = await this.comments.findCommentWithProduct(
        parsedCommentId,
      );

      if (!comment) {
        throw ExpressContractException.raw(404, {
          message: 'Commentaire non trouvé',
        });
      }

      const created = await this.comments.createReply({
        commentId: parsedCommentId,
        userId,
        reply: reply as string,
      });

      if (comment.userId !== userId) {
        await this.notifications.create({
          userId: comment.userId,
          type: 'PRODUCT',
          message: `Quelqu'un a répondu à votre commentaire sur un produit`,
          actionUrl: `/products/${comment.productId}#comment-${commentId}`,
          resourceId: comment.productId,
          resourceType: 'Product',
        });
      }

      const replyWithUser = await this.comments.findReplyWithUser(created.id);

      return {
        message: 'Réponse ajoutée avec succès',
        reply: replyWithUser,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        "Une erreur est survenue lors de l'ajout de la réponse",
        error,
      );
    }
  }
}

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
  ) {}

  async execute(userId: number, commentId: unknown) {
    try {
      const parsedCommentId = parseInt(String(commentId), 10);
      const comment = await this.comments.findCommentWithProduct(
        parsedCommentId,
      );

      if (!comment) {
        throw ExpressContractException.raw(404, {
          message: 'Commentaire non trouvé',
        });
      }

      if (comment.userId !== userId && comment.product.userId !== userId) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à supprimer ce commentaire",
        });
      }

      await this.comments.deleteRepliesByCommentId(parsedCommentId);
      await this.comments.deleteComment(parsedCommentId);
      await this.comments.decrementCommentsCount(comment.productId);

      return { message: 'Commentaire supprimé avec succès' };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        'Une erreur est survenue lors de la suppression du commentaire',
        error,
      );
    }
  }
}

@Injectable()
export class DeleteReplyUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
  ) {}

  async execute(userId: number, replyId: unknown) {
    try {
      const parsedReplyId = parseInt(String(replyId), 10);
      const reply = await this.comments.findReplyWithCommentAndProduct(
        parsedReplyId,
      );

      if (!reply) {
        throw ExpressContractException.raw(404, {
          message: 'Réponse non trouvée',
        });
      }

      if (
        reply.userId !== userId &&
        reply.comment.userId !== userId &&
        reply.comment.product.userId !== userId
      ) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à supprimer cette réponse",
        });
      }

      await this.comments.deleteReply(parsedReplyId);

      return { message: 'Réponse supprimée avec succès' };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        'Une erreur est survenue lors de la suppression de la réponse',
        error,
      );
    }
  }
}

@Injectable()
export class UpdateCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: CommentRepository,
  ) {}

  async execute(userId: number, commentId: unknown, comment: unknown) {
    try {
      const parsedCommentId = parseInt(String(commentId), 10);
      const existingComment = await this.comments.findCommentById(
        parsedCommentId,
      );

      if (!existingComment) {
        throw ExpressContractException.raw(404, {
          message: 'Commentaire non trouvé',
        });
      }

      if (existingComment.userId !== userId) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à modifier ce commentaire",
        });
      }

      const updatedComment = await this.comments.updateComment(
        parsedCommentId,
        comment as string,
      );

      return {
        message: 'Commentaire mis à jour avec succès',
        comment: updatedComment,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        'Une erreur est survenue lors de la mise à jour du commentaire',
        error,
      );
    }
  }
}
