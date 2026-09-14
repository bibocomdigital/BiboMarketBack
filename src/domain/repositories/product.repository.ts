import type {
  Product,
  ProductListFilter,
  ProductWriteInput,
} from '@domain/entities/product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  create(data: ProductWriteInput): Promise<Product>;
  update(id: number, data: ProductWriteInput): Promise<Product>;
  delete(id: number): Promise<void>;
  findById(id: number): Promise<Product | null>;
  findByIdWithImages(id: number): Promise<any>;
  findCreatedView(id: number): Promise<any>;
  findUpdatedView(id: number): Promise<any>;
  findDetailById(id: number, userId?: number): Promise<any>;
  findListed(
    filter: ProductListFilter,
    userId?: number,
  ): Promise<{ products: any[]; total: number }>;
  searchListed(
    filter: ProductListFilter,
    userId?: number,
  ): Promise<{ products: any[]; total: number }>;
  findByUserIdPaged(
    userId: number,
    page: number,
    limit: number,
  ): Promise<{ products: any[]; total: number }>;
  findByCategoryPaged(
    categoryId: number,
    page: number,
    limit: number,
  ): Promise<{ products: any[]; total: number }>;
  findLatest(limit: number): Promise<any[]>;
  findFeatured(limit: number): Promise<any[]>;
  findRelated(productId: number, categoryId: number, limit: number): Promise<any[]>;
  findCategorieProdById(id: number): Promise<any>;
  findAllCategories(): Promise<any[]>;
  createImages(
    data: { productId: number; imageUrl: string }[],
  ): Promise<void>;
  deleteImagesByProductId(productId: number): Promise<void>;
  deleteImagesByUrls(productId: number, urls: string[]): Promise<number>;
  countByUserId(userId: number): Promise<number>;
  countLowStock(userId: number): Promise<number>;
  groupCountByCategory(userId: number): Promise<
    { categorieProdId: number; count: number; categorieProd: { name: string } | null }[]
  >;
  findFollowerIds(userId: number): Promise<number[]>;
}
