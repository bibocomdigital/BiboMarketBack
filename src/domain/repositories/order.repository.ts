export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  findClientOrders(clientId: number): Promise<any[]>;
  findClientOrderById(orderId: number, clientId: number): Promise<any>;
  findClientOrderPending(orderId: number, clientId: number): Promise<any>;
  findClientOrderConfirmed(orderId: number, clientId: number): Promise<any>;
  findClientOrderWithShops(orderId: number, clientId: number): Promise<any>;
  findClientOrderWithMerchants(
    orderId: number,
    clientId: number,
    imageTake: number,
  ): Promise<any>;
  findByIdWithAuthContext(orderId: number): Promise<any>;
  updateStatus(orderId: number, status: string): Promise<any>;
  findUserWithShop(userId: number): Promise<any>;
  findMerchantOrderItems(shopId: number): Promise<any[]>;
  deleteNotificationsByOrderId(orderId: number): Promise<void>;
  deleteOrderItems(orderId: number): Promise<void>;
  deleteOrder(orderId: number): Promise<void>;
  findOldCanceledOrderIds(before: Date): Promise<number[]>;
  deleteNotificationsByOrderIds(ids: number[]): Promise<void>;
  deleteOrderItemsByOrderIds(ids: number[]): Promise<void>;
  deleteOrders(ids: number[]): Promise<number>;
  groupTopProducts(merchantId: number): Promise<any[]>;
  findProductPreview(
    id: number,
    select: Record<string, unknown>,
  ): Promise<any>;
  aggregateMerchantRevenue(shopId: number): Promise<{
    _sum: { price: number | null };
    _count: { id: number };
  }>;
  groupOrdersByStatus(
    shopId: number,
  ): Promise<{ status: string; _count: { id: number } }[]>;
  findRecentMerchantOrders(shopId: number, take: number): Promise<any[]>;
  findMerchantOrdersInRange(shopId: number, startDate: Date): Promise<any[]>;
  findShippedOlderThan(date: Date): Promise<{ id: number; clientId: number }[]>;
  createMessage(data: {
    senderId: number;
    receiverId: number;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  }): Promise<{ id: number }>;
}
