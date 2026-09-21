import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { SHOP_REPOSITORY } from '@domain/repositories/shop.repository';
import { PRODUCT_REPOSITORY } from '@domain/repositories/product.repository';
import { FILE_STORAGE } from '@application/ports/output/file-storage.port';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetFeaturedProductsUseCase,
  GetLatestProductsUseCase,
  GetMerchantProductsUseCase,
  GetProductByIdUseCase,
  GetProductCategoriesUseCase,
  GetProductStatsUseCase,
  GetProductsByCategoryUseCase,
  GetRelatedProductsUseCase,
  ListProductsUseCase,
  SearchProductsUseCase,
  UpdateProductStockUseCase,
  UpdateProductUseCase,
  UpdateProductWithImagesUseCase,
} from '@application/use-cases/product/product.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaShopRepository } from '@infrastructure/repositories/prisma-shop.repository';
import { PrismaProductRepository } from '@infrastructure/repositories/prisma-product.repository';
import { HybridFileStorage } from '@infrastructure/storage/hybrid-file-storage';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import { ProductController } from '@interface/controllers/product.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { ProductUploadFilter } from '@interface/filters/product-upload.filter';
import {
  OptionalUsersAuthGuard,
  UsersAuthGuard,
  UsersMerchantGuard,
} from '@interface/guards/users-auth.guard';

@Module({
  controllers: [ProductController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SHOP_REPOSITORY, useClass: PrismaShopRepository },
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: FILE_STORAGE, useFactory: () => new HybridFileStorage() },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    CreateProductUseCase,
    ListProductsUseCase,
    GetProductByIdUseCase,
    UpdateProductUseCase,
    UpdateProductWithImagesUseCase,
    DeleteProductUseCase,
    UpdateProductStockUseCase,
    GetMerchantProductsUseCase,
    SearchProductsUseCase,
    GetProductsByCategoryUseCase,
    GetLatestProductsUseCase,
    GetFeaturedProductsUseCase,
    GetProductCategoriesUseCase,
    GetProductStatsUseCase,
    GetRelatedProductsUseCase,
    UsersAuthGuard,
    OptionalUsersAuthGuard,
    UsersMerchantGuard,
    ExpressContractFilter,
    ProductUploadFilter,
  ],
})
export class ProductModule {}
