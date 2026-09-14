import { Module } from '@nestjs/common';
import { CATEGORIE_SHOP_REPOSITORY } from '@domain/repositories/categorie-shop.repository';
import { CreateCategorieShopUseCase } from '@application/use-cases/categorie-shop/create-categorie-shop.use-case';
import { DeleteCategorieShopUseCase } from '@application/use-cases/categorie-shop/delete-categorie-shop.use-case';
import { GetCategorieShopUseCase } from '@application/use-cases/categorie-shop/get-categorie-shop.use-case';
import { ListCategorieShopsUseCase } from '@application/use-cases/categorie-shop/list-categorie-shops.use-case';
import { UpdateCategorieShopUseCase } from '@application/use-cases/categorie-shop/update-categorie-shop.use-case';
import { PrismaCategorieShopRepository } from '@infrastructure/repositories/prisma-categorie-shop.repository';
import { CategorieShopController } from '@interface/controllers/categorie-shop.controller';

@Module({
  controllers: [CategorieShopController],
  providers: [
    {
      provide: CATEGORIE_SHOP_REPOSITORY,
      useClass: PrismaCategorieShopRepository,
    },
    CreateCategorieShopUseCase,
    ListCategorieShopsUseCase,
    GetCategorieShopUseCase,
    UpdateCategorieShopUseCase,
    DeleteCategorieShopUseCase,
  ],
})
export class CategorieShopModule {}
