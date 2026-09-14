import { Global, Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { MESSAGE_REPOSITORY } from '@domain/repositories/message.repository';
import { REALTIME_GATEWAY } from '@application/ports/output/realtime.port';
import {
  MarkSocketMessageReadUseCase,
  SendSocketMessageUseCase,
} from '@application/use-cases/socket/socket.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaMessageRepository } from '@infrastructure/repositories/prisma-message.repository';
import { SocketRealtimeService } from '@infrastructure/realtime/socket-realtime.service';
import { ChatGateway } from '@interface/gateways/chat.gateway';

@Global()
@Module({
  providers: [
    SocketRealtimeService,
    { provide: REALTIME_GATEWAY, useExisting: SocketRealtimeService },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
    SendSocketMessageUseCase,
    MarkSocketMessageReadUseCase,
    ChatGateway,
  ],
  exports: [REALTIME_GATEWAY],
})
export class RealtimeModule {}
