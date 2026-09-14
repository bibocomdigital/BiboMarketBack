import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  DeleteAllNotificationsUseCase,
  DeleteNotificationUseCase,
  GetUserNotificationsUseCase,
  MarkAllNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from '@application/use-cases/notification/notification.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

@ApiTags('notifications')
@UseFilters(ExpressContractFilter)
@UseGuards(UsersAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly getUserNotifications: GetUserNotificationsUseCase,
    private readonly markNotificationAsRead: MarkNotificationAsReadUseCase,
    private readonly markAllNotificationsAsRead: MarkAllNotificationsAsReadUseCase,
    private readonly deleteNotification: DeleteNotificationUseCase,
    private readonly deleteAllNotifications: DeleteAllNotificationsUseCase,
  ) {}

  @Get()
  list(@Req() request: Request) {
    return this.getUserNotifications.execute(currentUserId(request));
  }

  @Patch()
  markAll(@Req() request: Request) {
    return this.markAllNotificationsAsRead.execute(currentUserId(request));
  }

  @Patch(':id')
  markOne(@Param('id') id: string) {
    return this.markNotificationAsRead.execute(id);
  }

  @Delete()
  removeAll(@Req() request: Request) {
    return this.deleteAllNotifications.execute(currentUserId(request));
  }

  @Delete(':id')
  removeOne(@Param('id') id: string) {
    return this.deleteNotification.execute(id);
  }
}
