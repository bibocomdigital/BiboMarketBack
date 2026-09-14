import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { RealtimePort } from '@application/ports/output/realtime.port';

@Injectable()
export class SocketRealtimeService implements RealtimePort {
  private readonly connectedUsers = new Map<number, string>();
  private server: Server | null = null;

  attachServer(server: Server): void {
    this.server = server;
  }

  setConnected(userId: number, socketId: string): void {
    this.connectedUsers.set(userId, socketId);
  }

  removeConnected(userId: number): void {
    this.connectedUsers.delete(userId);
  }

  getSocketId(userId: number): string | undefined {
    return this.connectedUsers.get(userId);
  }

  emitToUser(userId: number, event: string, data: unknown): boolean {
    const socketId = this.connectedUsers.get(userId);
    if (!socketId || !this.server) {
      return false;
    }
    this.server.to(socketId).emit(event, data);
    return true;
  }

  emitToUserRoom(userId: number, event: string, data: unknown): void {
    this.server?.to(`user_${userId}`).emit(event, data);
  }

  broadcast(event: string, data: unknown): void {
    this.server?.emit(event, data);
  }
}
