import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { FRONTEND_URL } from '@application/config/env';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';
import {
  REALTIME_GATEWAY,
  type RealtimePort,
} from '@application/ports/output/realtime.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  MarkSocketMessageReadUseCase,
  SendSocketMessageUseCase,
} from '@application/use-cases/socket/socket.use-case';
import { SocketRealtimeService } from '@infrastructure/realtime/socket-realtime.service';

function rawUserId(token: string): number | undefined {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return undefined;
    }
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { userId?: number | string; id?: number | string };
    const raw = decoded.userId ?? decoded.id;
    if (raw === undefined || raw === null) {
      return undefined;
    }
    return Number(raw);
  } catch {
    return undefined;
  }
}

function socketUserId(socket: Socket): number {
  return Number(socket.data.userId);
}

@WebSocketGateway({
  cors: {
    origin: FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REALTIME_GATEWAY) private readonly realtime: RealtimePort,
    private readonly socketRealtime: SocketRealtimeService,
    private readonly sendSocketMessage: SendSocketMessageUseCase,
    private readonly markSocketMessageRead: MarkSocketMessageReadUseCase,
  ) {}

  afterInit(server: Server): void {
    this.socketRealtime.attachServer(server);

    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) {
          next(new Error('Authentication error: Token missing'));
          return;
        }

        const userId = rawUserId(token);
        if (!userId) {
          next(new Error('Authentication error: Invalid token'));
          return;
        }

        await this.jwtService.verifyToken(token);

        const user = await this.users.findById(userId);
        if (!user) {
          next(new Error('Authentication error: User not found'));
          return;
        }

        socket.data.userId = userId;
        socket.data.userData = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        };
        next();
      } catch {
        next(new Error('Authentication error'));
      }
    });
  }

  handleConnection(socket: Socket): void {
    const userId = socketUserId(socket);
    void this.registerConnection(socket, userId);
  }

  handleDisconnect(socket: Socket): void {
    const userId = socketUserId(socket);
    void this.unregisterConnection(socket, userId);
  }

  private async registerConnection(socket: Socket, userId: number): Promise<void> {
    await this.realtime.setConnected(userId, socket.id);
    void socket.join(`user_${userId}`);
    this.realtime.broadcast('user_status', { userId, status: 'online' });
    socket.emit('online_users', {
      userIds: await this.realtime.connectedUserIds(),
    });
  }

  private async unregisterConnection(socket: Socket, userId: number): Promise<void> {
    const current = await this.realtime.getSocketId(userId);
    if (current && current !== socket.id) return;
    await this.realtime.removeConnected(userId, socket.id);
    this.realtime.broadcast('user_status', { userId, status: 'offline' });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { receiverId?: unknown; content?: unknown },
  ) {
    try {
      const message = await this.sendSocketMessage.execute(
        socketUserId(socket),
        data.receiverId,
        data.content,
      );

      const receiverSocketId = await this.realtime.getSocketId(
        parseInt(String(data.receiverId), 10),
      );
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('receive_message', message);
      }

      socket.emit('message_sent', message);
    } catch (error) {
      socket.emit('message_error', {
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { receiverId?: unknown },
  ) {
    const receiverSocketId = await this.realtime.getSocketId(
      parseInt(String(data.receiverId), 10),
    );
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('user_typing', {
        userId: socketUserId(socket),
        typing: true,
      });
    }
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { receiverId?: unknown },
  ) {
    const receiverSocketId = await this.realtime.getSocketId(
      parseInt(String(data.receiverId), 10),
    );
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('user_typing', {
        userId: socketUserId(socket),
        typing: false,
      });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId?: unknown },
  ) {
    try {
      const result = await this.markSocketMessageRead.execute(
        socketUserId(socket),
        data.messageId,
      );
      if (!result) {
        return;
      }

      const senderSocketId = await this.realtime.getSocketId(result.senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('message_read', {
          messageId: result.updatedMessage.id,
          readAt: new Date(),
        });
      }
    } catch {
      // Express n'émet rien en cas d'erreur
    }
  }
}
