import { SocketRealtimeService } from './socket-realtime.service';

describe('SocketRealtimeService', () => {
  it('n’émet pas si l’utilisateur n’est pas connecté', () => {
    const realtime = new SocketRealtimeService();

    expect(realtime.emitToUser(8, 'new_notification', { id: 1 })).toBe(false);
  });

  it('mémorise la socket connectée', () => {
    const realtime = new SocketRealtimeService();
    realtime.setConnected(8, 'sock-1');

    expect(realtime.getSocketId(8)).toBe('sock-1');
    realtime.removeConnected(8);
    expect(realtime.getSocketId(8)).toBeUndefined();
  });
});
