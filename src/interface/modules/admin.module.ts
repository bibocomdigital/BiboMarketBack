import { Module } from '@nestjs/common';
import { ADMIN_REPOSITORY } from '@domain/repositories/admin.repository';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import { GetAdminDashboardUseCase } from '@application/use-cases/admin/admin-dashboard.use-case';
import {
  DeleteAdminUserUseCase,
  GetAdminUserUseCase,
  ListAdminUsersUseCase,
  UpdateAdminUserUseCase,
} from '@application/use-cases/admin/admin-users.use-case';
import {
  DeleteAdminShopUseCase,
  GetAdminShopUseCase,
  ListAdminFeedbacksUseCase,
  ListAdminShopsUseCase,
  UpdateAdminShopUseCase,
} from '@application/use-cases/admin/admin-shops.use-case';
import {
  DeleteAdminProductUseCase,
  GetAdminProductUseCase,
  ListAdminProductsUseCase,
  UpdateAdminProductUseCase,
} from '@application/use-cases/admin/admin-products.use-case';
import {
  GetAdminOrderUseCase,
  ListAdminOrdersUseCase,
  UpdateAdminOrderStatusUseCase,
} from '@application/use-cases/admin/admin-orders.use-case';
import { PrismaAdminRepository } from '@infrastructure/repositories/prisma-admin.repository';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import { AdminController } from '@interface/controllers/admin.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';

@Module({
  controllers: [AdminController],
  providers: [
    { provide: ADMIN_REPOSITORY, useClass: PrismaAdminRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    GetAdminDashboardUseCase,
    ListAdminUsersUseCase,
    GetAdminUserUseCase,
    UpdateAdminUserUseCase,
    DeleteAdminUserUseCase,
    ListAdminShopsUseCase,
    GetAdminShopUseCase,
    UpdateAdminShopUseCase,
    DeleteAdminShopUseCase,
    ListAdminFeedbacksUseCase,
    ListAdminProductsUseCase,
    GetAdminProductUseCase,
    UpdateAdminProductUseCase,
    DeleteAdminProductUseCase,
    ListAdminOrdersUseCase,
    GetAdminOrderUseCase,
    UpdateAdminOrderStatusUseCase,
    UsersAuthGuard,
    UsersAdminGuard,
    ExpressContractFilter,
  ],
})
export class AdminModule {}
