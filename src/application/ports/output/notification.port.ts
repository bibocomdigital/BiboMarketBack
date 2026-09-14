export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');

export interface NotificationInput {
  userId: number;
  type: string;
  message: string;
  actionUrl?: string | null;
  resourceId?: number | null;
  resourceType?: string | null;
  priority?: number;
}

export interface NotificationServicePort {
  create(input: NotificationInput): Promise<void>;
}
