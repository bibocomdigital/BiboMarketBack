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
  CheckIfFollowingUseCase,
  GetUserFollowersUseCase,
  GetUserFollowingUseCase,
  ToggleFollowUseCase,
} from '@application/use-cases/subscription/subscription.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

@ApiTags('users')
@UseFilters(ExpressContractFilter)
@Controller('users')
export class SubscriptionController {
  constructor(
    private readonly toggleFollow: ToggleFollowUseCase,
    private readonly getUserFollowers: GetUserFollowersUseCase,
    private readonly getUserFollowing: GetUserFollowingUseCase,
    private readonly checkIfFollowing: CheckIfFollowingUseCase,
  ) {}

  @Post(':userId/toggle-follow')
  @HttpCode(200)
  @UseGuards(UsersAuthGuard)
  toggle(@Req() request: Request, @Param('userId') userId: string) {
    return this.toggleFollow.execute(currentUserId(request), userId);
  }

  @Get(':userId/followers')
  followers(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getUserFollowers.execute(userId, page ?? 1, limit ?? 20);
  }

  @Get(':userId/following')
  following(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getUserFollowing.execute(userId, page ?? 1, limit ?? 20);
  }

  @Get(':userId/isFollowing')
  @UseGuards(UsersAuthGuard)
  isFollowing(@Req() request: Request, @Param('userId') userId: string) {
    return this.checkIfFollowing.execute(currentUserId(request), userId);
  }
}
