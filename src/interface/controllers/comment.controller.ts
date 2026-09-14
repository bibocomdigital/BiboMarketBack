import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AddCommentUseCase,
  DeleteCommentUseCase,
  DeleteReplyUseCase,
  GetProductCommentsUseCase,
  ReplyToCommentUseCase,
  UpdateCommentUseCase,
} from '@application/use-cases/comment/comment.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

@ApiTags('comments')
@UseFilters(ExpressContractFilter)
@Controller('products')
export class ProductCommentController {
  constructor(
    private readonly addComment: AddCommentUseCase,
    private readonly getProductComments: GetProductCommentsUseCase,
  ) {}

  @Post(':productId/comments')
  @UseGuards(UsersAuthGuard)
  add(
    @Req() request: Request,
    @Param('productId') productId: string,
    @Body() body: { comment?: string },
  ) {
    return this.addComment.execute(
      currentUserId(request),
      productId,
      body.comment,
    );
  }

  @Get(':productId/comments')
  list(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getProductComments.execute(productId, page ?? 1, limit ?? 10);
  }
}

@ApiTags('comments')
@UseFilters(ExpressContractFilter)
@Controller('comments')
export class CommentController {
  constructor(
    private readonly replyToComment: ReplyToCommentUseCase,
    private readonly deleteComment: DeleteCommentUseCase,
    private readonly updateComment: UpdateCommentUseCase,
  ) {}

  @Post(':commentId/replies')
  @UseGuards(UsersAuthGuard)
  reply(
    @Req() request: Request,
    @Param('commentId') commentId: string,
    @Body() body: { reply?: string },
  ) {
    return this.replyToComment.execute(
      currentUserId(request),
      commentId,
      body.reply,
    );
  }

  @Delete(':commentId')
  @UseGuards(UsersAuthGuard)
  remove(@Req() request: Request, @Param('commentId') commentId: string) {
    return this.deleteComment.execute(currentUserId(request), commentId);
  }

  @Put(':commentId')
  @UseGuards(UsersAuthGuard)
  update(
    @Req() request: Request,
    @Param('commentId') commentId: string,
    @Body() body: { comment?: string },
  ) {
    return this.updateComment.execute(
      currentUserId(request),
      commentId,
      body.comment,
    );
  }
}

@ApiTags('comments')
@UseFilters(ExpressContractFilter)
@Controller('replies')
export class ReplyController {
  constructor(private readonly deleteReply: DeleteReplyUseCase) {}

  @Delete(':replyId')
  @UseGuards(UsersAuthGuard)
  remove(@Req() request: Request, @Param('replyId') replyId: string) {
    return this.deleteReply.execute(currentUserId(request), replyId);
  }
}
