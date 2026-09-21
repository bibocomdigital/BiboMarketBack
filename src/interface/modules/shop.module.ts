import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { SHOP_REPOSITORY } from '@domain/repositories/shop.repository';
import { EMAIL_SERVICE } from '@application/ports/output/email-service.port';
import { FILE_STORAGE } from '@application/ports/output/file-storage.port';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import {
  ContactMerchantUseCase,
  CreateShopUseCase,
  DeleteShopUseCase,
  GetMyShopUseCase,
  GetShopByIdUseCase,
  GetShopDetailsUseCase,
  GetShopMessagesUseCase,
  GetShopProductsUseCase,
  ListShopsUseCase,
  RespondToContactUseCase,
  UpdateShopUseCase,
} from '@application/use-cases/shop/shop.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaShopRepository } from '@infrastructure/repositories/prisma-shop.repository';
import { SmtpEmailAdapter } from '@infrastructure/email/smtp-email.adapter';
import { HybridFileStorage } from '@infrastructure/storage/hybrid-file-storage';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import { ShopController } from '@interface/controllers/shop.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { LogoUploadFilter } from '@interface/filters/logo-upload.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [ShopController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SHOP_REPOSITORY, useClass: PrismaShopRepository },
    { provide: EMAIL_SERVICE, useClass: SmtpEmailAdapter },
    { provide: FILE_STORAGE, useFactory: () => new HybridFileStorage() },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    CreateShopUseCase,
    GetMyShopUseCase,
    GetShopByIdUseCase,
    GetShopProductsUseCase,
    UpdateShopUseCase,
    DeleteShopUseCase,
    ListShopsUseCase,
    GetShopDetailsUseCase,
    ContactMerchantUseCase,
    RespondToContactUseCase,
    GetShopMessagesUseCase,
    UsersAuthGuard,
    ExpressContractFilter,
    LogoUploadFilter,
  ],
})
export class ShopModule {}
