export interface Shop {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  phoneNumber: string;
  address: string | null;
  userId: number;
  verifiedBadge: boolean;
  status: boolean;
  categorieShopId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ShopWriteInput = Record<string, unknown>;

export interface ShopProductFilter {
  shopId: number;
  page: number;
  limit: number;
  categoryId?: number;
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  order: 'asc' | 'desc';
  status?: string;
}

export interface MerchantContact {
  id: number;
  shopId: number;
  merchantId: number;
  subject: string;
  senderEmail: string;
  message: string;
  status: string;
  createdAt: Date;
}
