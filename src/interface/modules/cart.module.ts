import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { CART_REPOSITORY } from '@domain/repositories/cart.repository';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import {
  AddToCartUseCase,
  ClearCartUseCase,
  CreateOrderFromCartUseCase,
  GetCartUseCase,
  RemoveFromCartUseCase,
  ShareCartUseCase,
  UpdateCartItemUseCase,
} from '@application/use-cases/cart/cart.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaCartRepository } from '@infrastructure/repositories/prisma-cart.repository';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import { CartController } from '@interface/controllers/cart.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [CartController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    AddToCartUseCase,
    GetCartUseCase,
    UpdateCartItemUseCase,
    RemoveFromCartUseCase,
    ClearCartUseCase,
    ShareCartUseCase,
    CreateOrderFromCartUseCase,
    UsersAuthGuard,
    ExpressContractFilter,
  ],
})
export class CartModule {}
