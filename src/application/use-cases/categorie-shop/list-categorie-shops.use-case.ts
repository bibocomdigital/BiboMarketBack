import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORIE_SHOP_REPOSITORY,
  type CategorieShopRepository,
} from '@domain/repositories/categorie-shop.repository';

@Injectable()
export class ListCategorieShopsUseCase {
  constructor(
    @Inject(CATEGORIE_SHOP_REPOSITORY)
    private readonly categorieShopRepository: CategorieShopRepository,
  ) {}

  execute() {
    return this.categorieShopRepository.findAll();
  }
}
