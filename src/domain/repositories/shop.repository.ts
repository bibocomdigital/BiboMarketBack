import type {
  MerchantContact,
  Shop,
  ShopProductFilter,
  ShopWriteInput,
} from '@domain/entities/shop.entity';

export const SHOP_REPOSITORY = Symbol('SHOP_REPOSITORY');

export interface ShopRepository {
  findByUserId(userId: number): Promise<Shop | null>;
  findById(id: number): Promise<Shop | null>;
  findByIdWithOwner(id: number): Promise<any>;
  findAllWithOwnerPreview(): Promise<any[]>;
  create(data: ShopWriteInput): Promise<Shop>;
  update(id: number, data: ShopWriteInput): Promise<Shop>;
  delete(id: number): Promise<void>;
  findProductsByShopId(shopId: number, options?: { take?: number; orderByCreatedAt?: boolean }): Promise<any[]>;
  countProducts(shopId: number): Promise<number>;
  findFilteredProducts(filter: ShopProductFilter): Promise<{ products: any[]; total: number }>;
  findProductsWithImages(shopId: number): Promise<any[]>;
  deleteProductImagesByShopId(shopId: number): Promise<void>;
  deleteProductsByShopId(shopId: number): Promise<void>;
  createContact(data: {
    shopId: number;
    merchantId: number;
    subject: string;
    senderEmail: string;
    message: string;
    status: string;
  }): Promise<MerchantContact>;
  findContactById(id: number): Promise<any>;
  createContactResponse(data: {
    merchantContactId: number;
    merchantId: number;
    response: string;
  }): Promise<{ id: number; createdAt: Date }>;
  markContactResponded(id: number): Promise<void>;
  findContactsForUser(userId: number, email?: string | null): Promise<any[]>;
}
