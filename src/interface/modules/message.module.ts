import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { MESSAGE_REPOSITORY } from '@domain/repositories/message.repository';
import { FILE_STORAGE } from '@application/ports/output/file-storage.port';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
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
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaMessageRepository } from '@infrastructure/repositories/prisma-message.repository';
import { CloudinaryFileStorage } from '@infrastructure/storage/cloudinary-file-storage';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import { MessageController } from '@interface/controllers/message.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { MessageUploadFilter } from '@interface/filters/message-upload.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [MessageController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
    { provide: FILE_STORAGE, useClass: CloudinaryFileStorage },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    SendMessageUseCase,
    GetConversationsUseCase,
    GetMessagesUseCase,
    UpdateMessageUseCase,
    DeleteMessageUseCase,
    MarkMessageAsReadUseCase,
    MarkAllMessagesAsReadUseCase,
    GetUnreadCountUseCase,
    SearchMessagesUseCase,
    UsersAuthGuard,
    ExpressContractFilter,
    MessageUploadFilter,
  ],
})
export class MessageModule {}
