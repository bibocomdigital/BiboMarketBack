import { SocketRealtimeService } from '@infrastructure/realtime/socket-realtime.service';
import type { RedisLike } from '@infrastructure/redis/redis.client';

describe('SocketRealtimeService', () => {
  it('n’émet pas si l’utilisateur n’est pas connecté', async () => {
    const realtime = new SocketRealtimeService();

    await expect(realtime.emitToUser(8, 'new_notification', { id: 1 })).resolves.toBe(false);
  });

  it('mémorise la socket connectée en mémoire', async () => {
    const realtime = new SocketRealtimeService();
    await realtime.setConnected(8, 'sock-1');

    expect(await realtime.getSocketId(8)).toBe('sock-1');
    expect(await realtime.connectedUserIds()).toEqual([8]);
    await realtime.removeConnected(8);
    expect(await realtime.getSocketId(8)).toBeUndefined();
    expect(await realtime.connectedUserIds()).toEqual([]);
  });

  it('persiste les connexions socket dans Redis', async () => {
    const store = new Map<string, string>();
    const setStore = new Set<string>();
    const redis: RedisLike = {
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      del: jest.fn(async (key: string) => {
        store.delete(key);
        return 1;
      }),
      sadd: jest.fn(async (_key: string, member: string) => {
        setStore.add(member);
        return 1;
      }),
      srem: jest.fn(async (_key: string, member: string) => {
        setStore.delete(member);
        return 1;
      }),
      smembers: jest.fn(async () => Array.from(setStore)),
      expire: jest.fn(async () => 1),
    };

    const realtime = new SocketRealtimeService(redis);
    await realtime.setConnected(8, 'sock-redis');

    expect(await realtime.getSocketId(8)).toBe('sock-redis');
    expect(await realtime.connectedUserIds()).toEqual([8]);
    expect(redis.set).toHaveBeenCalled();
    expect(redis.sadd).toHaveBeenCalledWith('bibo:presence:online', '8');

    await realtime.removeConnected(8, 'sock-redis');
    expect(await realtime.getSocketId(8)).toBeUndefined();
    expect(await realtime.connectedUserIds()).toEqual([]);
  });
});
