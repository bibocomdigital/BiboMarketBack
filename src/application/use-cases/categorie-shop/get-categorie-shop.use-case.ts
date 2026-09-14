import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORIE_SHOP_REPOSITORY,
  type CategorieShopRepository,
} from '@domain/repositories/categorie-shop.repository';

@Injectable()
export class GetCategorieShopUseCase {
  constructor(
    @Inject(CATEGORIE_SHOP_REPOSITORY)
    private readonly categorieShopRepository: CategorieShopRepository,
  ) {}

  execute(id: number) {
    return this.categorieShopRepository.findById(id);
  }
}
