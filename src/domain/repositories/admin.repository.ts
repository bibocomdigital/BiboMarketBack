export const ADMIN_REPOSITORY = Symbol('ADMIN_REPOSITORY');

export const SOLD_ORDER_STATUSES = [
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
] as const;

export interface AdminListFilter {
  page: number;
  limit: number;
  search?: string;
}

export interface AdminUserListFilter extends AdminListFilter {
  role?: string;
}

export interface AdminShopListFilter extends AdminListFilter {
  status?: boolean;
  verified?: boolean;
}

export interface AdminProductListFilter extends AdminListFilter {
  status?: string;
  shopId?: number;
  lowStock?: boolean;
  lowStockThreshold?: number;
}

export interface AdminOrderListFilter extends AdminListFilter {
  status?: string;
  paymentMethod?: string;
}

export interface AdminRepository {
  countUsers(): Promise<number>;
  groupUsersByRole(): Promise<{ role: string; count: number }[]>;
  groupUsersByGender(): Promise<{ gender: string | null; count: number }[]>;
  groupUsersByCity(take: number): Promise<
    { city: string | null; country: string | null; count: number }[]
  >;
  findUserCreatedAtSince(startDate: Date): Promise<{ createdAt: Date }[]>;

  countShops(): Promise<number>;
  countActiveShops(): Promise<number>;
  countVerifiedShops(): Promise<number>;

  countProducts(): Promise<number>;
  groupProductsByStatus(): Promise<{ status: string; count: number }[]>;
  countLowStock(threshold: number): Promise<number>;

  countOrders(): Promise<number>;
  groupOrdersByStatus(): Promise<{ status: string; count: number }[]>;
  groupOrdersByPaymentMethod(): Promise<
    { paymentMethod: string; count: number }[]
  >;
  findSoldOrdersSince(startDate: Date): Promise<
    {
      id: number;
      createdAt: Date;
      orderItems: { price: number; quantity: number; productId: number }[];
    }[]
  >;
  aggregateSoldRevenue(): Promise<{ revenue: number; orderCount: number }>;
  findTopSoldProducts(take: number): Promise<
    {
      productId: number;
      totalSold: number;
      totalRevenue: number;
      orderCount: number;
    }[]
  >;
  findProductPreviews(
    ids: number[],
  ): Promise<
    { id: number; name: string; price: number; imageUrl: string | null }[]
  >;
  findRecentOrders(take: number): Promise<
    {
      id: number;
      totalAmount: number;
      status: string;
      paymentMethod: string;
      createdAt: Date;
      client: { firstName: string | null; lastName: string | null };
    }[]
  >;

  findUsers(filter: AdminUserListFilter): Promise<{ users: any[]; total: number }>;
  findUserById(id: number): Promise<any>;
  updateUser(id: number, data: Record<string, unknown>): Promise<any>;
  deleteUser(id: number): Promise<void>;
  countUserDependencies(id: number): Promise<{
    shop: number;
    orders: number;
    products: number;
  }>;

  findShops(filter: AdminShopListFilter): Promise<{ shops: any[]; total: number }>;
  findShopById(id: number): Promise<any>;
  updateShop(id: number, data: Record<string, unknown>): Promise<any>;
  countShopOrderItems(shopId: number): Promise<number>;
  deleteShopCascade(shopId: number): Promise<void>;

  findProducts(
    filter: AdminProductListFilter,
  ): Promise<{ products: any[]; total: number }>;
  findProductById(id: number): Promise<any>;
  updateProduct(id: number, data: Record<string, unknown>): Promise<any>;
  countProductOrderItems(productId: number): Promise<number>;
  deleteProductCascade(productId: number): Promise<void>;

  findOrders(filter: AdminOrderListFilter): Promise<{ orders: any[]; total: number }>;
  findOrderById(id: number): Promise<any>;
  updateOrderStatus(id: number, status: string): Promise<any>;

  findFeedbacks(
    filter: AdminListFilter,
  ): Promise<{ feedbacks: any[]; total: number }>;
}
