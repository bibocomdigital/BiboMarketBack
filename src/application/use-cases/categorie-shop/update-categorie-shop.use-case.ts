import { Inject, Injectable } from '@nestjs/common';
import type { CategorieShopWriteInput } from '@domain/entities/categorie-shop.entity';
import {
  CATEGORIE_SHOP_REPOSITORY,
  type CategorieShopRepository,
} from '@domain/repositories/categorie-shop.repository';

@Injectable()
export class UpdateCategorieShopUseCase {
  constructor(
    @Inject(CATEGORIE_SHOP_REPOSITORY)
    private readonly categorieShopRepository: CategorieShopRepository,
  ) {}

  execute(id: number, input: CategorieShopWriteInput) {
    return this.categorieShopRepository.update(id, input);
  }
}
