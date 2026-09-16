import { Global, Module } from '@nestjs/common';
import {
  REDIS_CLIENT,
  RedisClientService,
  redisClientProvider,
} from './redis.client';

@Global()
@Module({
  providers: [RedisClientService, redisClientProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
