export interface Order {
  id: number;
  clientId: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

export const VALID_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELED',
] as const;

export type OrderStatusName = (typeof VALID_ORDER_STATUSES)[number];
