export const REALTIME_GATEWAY = Symbol('REALTIME_GATEWAY');

export interface RealtimePort {
  setConnected(userId: number, socketId: string): void;
  removeConnected(userId: number): void;
  getSocketId(userId: number): string | undefined;
  emitToUser(userId: number, event: string, data: unknown): boolean;
  emitToUserRoom(userId: number, event: string, data: unknown): void;
  broadcast(event: string, data: unknown): void;
}
