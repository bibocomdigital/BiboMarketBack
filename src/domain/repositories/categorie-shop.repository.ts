import type {
  CategorieShop,
  CategorieShopWriteInput,
} from '@domain/entities/categorie-shop.entity';

export const CATEGORIE_SHOP_REPOSITORY = Symbol('CATEGORIE_SHOP_REPOSITORY');

export interface CategorieShopRepository {
  create(data: CategorieShopWriteInput): Promise<CategorieShop>;
  findAll(): Promise<CategorieShop[]>;
  findById(id: number): Promise<CategorieShop | null>;
  update(id: number, data: CategorieShopWriteInput): Promise<CategorieShop>;
  delete(id: number): Promise<void>;
}
