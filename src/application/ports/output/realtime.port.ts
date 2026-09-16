export const REALTIME_GATEWAY = Symbol('REALTIME_GATEWAY');

export interface RealtimePort {
  setConnected(userId: number, socketId: string): Promise<void>;
  removeConnected(userId: number, socketId?: string): Promise<void>;
  getSocketId(userId: number): Promise<string | undefined>;
  connectedUserIds(): Promise<number[]>;
  emitToUser(userId: number, event: string, data: unknown): Promise<boolean>;
  emitToUserRoom(userId: number, event: string, data: unknown): void;
  broadcast(event: string, data: unknown): void;
}
