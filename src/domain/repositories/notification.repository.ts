export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepository {
  findByUserId(userId: number): Promise<any[]>;
  markAsRead(id: number): Promise<any>;
  markAllAsRead(userId: number): Promise<void>;
  deleteById(id: number): Promise<void>;
  deleteAllByUserId(userId: number): Promise<void>;
}
