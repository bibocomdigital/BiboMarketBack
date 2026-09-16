import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_URL } from '@application/config/env';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const PRESENCE_TTL_SECONDS = 90;
export const PRESENCE_ONLINE_KEY = 'bibo:presence:online';

export function presenceSocketKey(userId: number): string {
  return `bibo:presence:socket:${userId}`;
}

@Injectable()
export class RedisClientService {
  readonly client: Redis | null;
  private readonly logger = new Logger(RedisClientService.name);

  constructor() {
    if (!REDIS_URL) {
      this.client = null;
      this.logger.warn('REDIS_URL absent : présence Socket en mémoire uniquement');
      return;
    }

    this.client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.client.on('error', (error) => {
      this.logger.error(`Redis: ${error.message}`);
    });
    void this.client.connect().catch((error: Error) => {
      this.logger.error(`Connexion Redis impossible: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    if (!this.client) return;
    this.client.disconnect();
  }
}

export const redisClientProvider = {
  provide: REDIS_CLIENT,
  useFactory: (service: RedisClientService) => service.client,
  inject: [RedisClientService],
};

export type RedisLike = {
  set(key: string, value: string, expiryMode?: string, ttl?: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
  sadd(key: string, member: string): Promise<unknown>;
  srem(key: string, member: string): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export function optionalRedis(
  redis?: Redis | RedisLike | null,
): redis is Redis | RedisLike {
  return !!redis;
}
