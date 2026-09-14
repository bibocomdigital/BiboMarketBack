import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { COMMENT_REPOSITORY } from '@domain/repositories/comment.repository';
import { LIKE_REPOSITORY } from '@domain/repositories/like.repository';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import {
  AddCommentUseCase,
  DeleteCommentUseCase,
  DeleteReplyUseCase,
  GetProductCommentsUseCase,
  ReplyToCommentUseCase,
  UpdateCommentUseCase,
} from '@application/use-cases/comment/comment.use-case';
import {
  GetProductLikesUseCase,
  GetUserReactionUseCase,
  ToggleDislikeUseCase,
  ToggleLikeUseCase,
} from '@application/use-cases/like/like.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaCommentRepository } from '@infrastructure/repositories/prisma-comment.repository';
import { PrismaLikeRepository } from '@infrastructure/repositories/prisma-like.repository';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import {
  CommentController,
  ProductCommentController,
  ReplyController,
} from '@interface/controllers/comment.controller';
import { ProductLikeController } from '@interface/controllers/like.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [
    ProductCommentController,
    ProductLikeController,
    CommentController,
    ReplyController,
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: COMMENT_REPOSITORY, useClass: PrismaCommentRepository },
    { provide: LIKE_REPOSITORY, useClass: PrismaLikeRepository },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    AddCommentUseCase,
    GetProductCommentsUseCase,
    ReplyToCommentUseCase,
    DeleteCommentUseCase,
    DeleteReplyUseCase,
    UpdateCommentUseCase,
    ToggleLikeUseCase,
    ToggleDislikeUseCase,
    GetProductLikesUseCase,
    GetUserReactionUseCase,
    UsersAuthGuard,
    ExpressContractFilter,
  ],
})
export class CommentLikeModule {}
