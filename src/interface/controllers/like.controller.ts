import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  GetProductLikesUseCase,
  GetUserReactionUseCase,
  ToggleDislikeUseCase,
  ToggleLikeUseCase,
} from '@application/use-cases/like/like.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

@ApiTags('likes')
@UseFilters(ExpressContractFilter)
@Controller('products')
export class ProductLikeController {
  constructor(
    private readonly toggleLike: ToggleLikeUseCase,
    private readonly toggleDislike: ToggleDislikeUseCase,
    private readonly getProductLikes: GetProductLikesUseCase,
    private readonly getUserReaction: GetUserReactionUseCase,
  ) {}

  @Post(':productId/like')
  @HttpCode(200)
  @UseGuards(UsersAuthGuard)
  like(@Req() request: Request, @Param('productId') productId: string) {
    return this.toggleLike.execute(currentUserId(request), productId);
  }

  @Post(':productId/dislike')
  @HttpCode(200)
  @UseGuards(UsersAuthGuard)
  dislike(@Req() request: Request, @Param('productId') productId: string) {
    return this.toggleDislike.execute(currentUserId(request), productId);
  }

  @Get(':productId/likes')
  list(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.getProductLikes.execute(
      productId,
      page ?? 1,
      limit ?? 10,
      type ?? 'LIKE',
    );
  }

  @Get(':productId/user-reaction')
  @UseGuards(UsersAuthGuard)
  reaction(@Req() request: Request, @Param('productId') productId: string) {
    return this.getUserReaction.execute(currentUserId(request), productId);
  }
}
