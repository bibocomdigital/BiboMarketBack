import type {
  CategorieProd,
  CategorieProdWriteInput,
} from '@domain/entities/categorie-prod.entity';

export const CATEGORIE_PROD_REPOSITORY = Symbol('CATEGORIE_PROD_REPOSITORY');

export interface CategorieProdRepository {
  create(data: CategorieProdWriteInput): Promise<CategorieProd>;
  findAll(): Promise<CategorieProd[]>;
  findById(id: number): Promise<CategorieProd | null>;
  update(id: number, data: CategorieProdWriteInput): Promise<CategorieProd>;
  delete(id: number): Promise<void>;
}
