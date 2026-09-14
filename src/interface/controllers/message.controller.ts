import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  DeleteMessageUseCase,
  GetConversationsUseCase,
  GetMessagesUseCase,
  GetUnreadCountUseCase,
  MarkAllMessagesAsReadUseCase,
  MarkMessageAsReadUseCase,
  SearchMessagesUseCase,
  SendMessageUseCase,
  UpdateMessageUseCase,
} from '@application/use-cases/message/message.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { MessageUploadFilter } from '@interface/filters/message-upload.filter';
import { MessageMediaInterceptor } from '@interface/interceptors/message-media.interceptor';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

@ApiTags('messages')
@UseFilters(MessageUploadFilter, ExpressContractFilter)
@UseGuards(UsersAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(
    private readonly sendMessage: SendMessageUseCase,
    private readonly getConversations: GetConversationsUseCase,
    private readonly getMessages: GetMessagesUseCase,
    private readonly updateMessage: UpdateMessageUseCase,
    private readonly deleteMessage: DeleteMessageUseCase,
    private readonly markMessageAsRead: MarkMessageAsReadUseCase,
    private readonly markAllMessagesAsRead: MarkAllMessagesAsReadUseCase,
    private readonly getUnreadCount: GetUnreadCountUseCase,
    private readonly searchMessages: SearchMessagesUseCase,
  ) {}

  @Post('send')
  @HttpCode(201)
  @UseInterceptors(MessageMediaInterceptor)
  send(
    @Req() request: Request,
    @Body() body: { receiverId?: string | number; content?: string },
    @UploadedFile() file?: { path: string; originalname: string; mimetype: string; size: number },
  ) {
    return this.sendMessage.execute(
      currentUserId(request),
      {
        firstName: request.user?.firstName,
        lastName: request.user?.lastName,
      },
      body,
      file,
    );
  }

  @Get('conversations')
  conversations(@Req() request: Request) {
    return this.getConversations.execute(currentUserId(request));
  }

  @Get('unread/count')
  unread(@Req() request: Request) {
    return this.getUnreadCount.execute(currentUserId(request));
  }

  @Get('search')
  search(@Req() request: Request, @Query('query') query?: string) {
    return this.searchMessages.execute(currentUserId(request), query);
  }

  @Get('with/:partnerId')
  thread(@Req() request: Request, @Param('partnerId') partnerId: string) {
    return this.getMessages.execute(currentUserId(request), partnerId);
  }

  @Patch('read/all/:partnerId')
  markAll(@Req() request: Request, @Param('partnerId') partnerId: string) {
    return this.markAllMessagesAsRead.execute(currentUserId(request), partnerId);
  }

  @Patch(':messageId/read')
  markOne(@Req() request: Request, @Param('messageId') messageId: string) {
    return this.markMessageAsRead.execute(currentUserId(request), messageId);
  }

  @Put(':messageId')
  update(
    @Req() request: Request,
    @Param('messageId') messageId: string,
    @Body() body: { content?: string },
  ) {
    return this.updateMessage.execute(
      currentUserId(request),
      messageId,
      body.content,
    );
  }

  @Delete(':messageId')
  remove(
    @Req() request: Request,
    @Param('messageId') messageId: string,
    @Query('forEveryone') forEveryone?: string,
  ) {
    return this.deleteMessage.execute(
      currentUserId(request),
      messageId,
      forEveryone,
    );
  }
}
