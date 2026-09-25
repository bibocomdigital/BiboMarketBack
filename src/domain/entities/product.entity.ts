export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  promoPrice?: number | null;
  stock: number;
  videoUrl: string | null;
  status: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  shopId: number;
  userId: number;
  categorieProdId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductWriteInput = Record<string, unknown>;

export interface ProductListFilter {
  status?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
  search?: string;
}

export interface UploadedProductFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}
