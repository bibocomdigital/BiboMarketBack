import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { RealtimePort } from '@application/ports/output/realtime.port';
import {
  PRESENCE_ONLINE_KEY,
  PRESENCE_TTL_SECONDS,
  REDIS_CLIENT,
  optionalRedis,
  presenceSocketKey,
  type RedisLike,
} from '@infrastructure/redis/redis.client';

@Injectable()
export class SocketRealtimeService implements RealtimePort {
  private readonly memory = new Map<number, string>();
  private readonly logger = new Logger(SocketRealtimeService.name);
  private server: Server | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: RedisLike | null,
  ) {}

  attachServer(server: Server): void {
    this.server = server;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      void this.refreshPresenceTtl();
    }, 30_000);
  }

  async setConnected(userId: number, socketId: string): Promise<void> {
    this.memory.set(userId, socketId);
    if (!optionalRedis(this.redis)) return;
    try {
      await this.redis.set(
        presenceSocketKey(userId),
        socketId,
        'EX',
        PRESENCE_TTL_SECONDS,
      );
      await this.redis.sadd(PRESENCE_ONLINE_KEY, String(userId));
    } catch (error) {
      this.logger.error(
        `Redis setConnected: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async removeConnected(userId: number, socketId?: string): Promise<void> {
    const local = this.memory.get(userId);
    if (!socketId || local === socketId) {
      this.memory.delete(userId);
    }

    if (!optionalRedis(this.redis)) return;
    try {
      if (socketId) {
        const current = await this.redis.get(presenceSocketKey(userId));
        if (current && current !== socketId) return;
      }
      await this.redis.del(presenceSocketKey(userId));
      await this.redis.srem(PRESENCE_ONLINE_KEY, String(userId));
    } catch (error) {
      this.logger.error(
        `Redis removeConnected: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSocketId(userId: number): Promise<string | undefined> {
    if (optionalRedis(this.redis)) {
      try {
        const remote = await this.redis.get(presenceSocketKey(userId));
        if (remote) return remote;
      } catch (error) {
        this.logger.error(
          `Redis getSocketId: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return this.memory.get(userId);
  }

  async connectedUserIds(): Promise<number[]> {
    if (optionalRedis(this.redis)) {
      try {
        const members = await this.redis.smembers(PRESENCE_ONLINE_KEY);
        const live: number[] = [];
        for (const member of members) {
          const userId = Number(member);
          if (!Number.isFinite(userId)) continue;
          const socketId = await this.redis.get(presenceSocketKey(userId));
          if (socketId) {
            live.push(userId);
          } else {
            await this.redis.srem(PRESENCE_ONLINE_KEY, member);
          }
        }
        return live;
      } catch (error) {
        this.logger.error(
          `Redis connectedUserIds: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return Array.from(this.memory.keys());
  }

  async emitToUser(userId: number, event: string, data: unknown): Promise<boolean> {
    const socketId = await this.getSocketId(userId);
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

  private async refreshPresenceTtl(): Promise<void> {
    if (!optionalRedis(this.redis) || !this.server) return;
    for (const [userId, socketId] of this.memory) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) {
        await this.removeConnected(userId, socketId);
        continue;
      }
      try {
        await this.redis.expire(presenceSocketKey(userId), PRESENCE_TTL_SECONDS);
        await this.redis.sadd(PRESENCE_ONLINE_KEY, String(userId));
      } catch {
        // ignore heartbeat errors
      }
    }
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }
}
