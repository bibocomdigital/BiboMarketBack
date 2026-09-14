import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '@domain/repositories/user.repository';
import { ORDER_REPOSITORY } from '@domain/repositories/order.repository';
import { NOTIFICATION_SERVICE } from '@application/ports/output/notification.port';
import {
  AutoConfirmDeliveriesUseCase,
  CheckOrderConfirmationImprovedUseCase,
  CheckOrderConfirmationUseCase,
  CleanupCanceledOrdersUseCase,
  DeleteOrderUseCase,
  GetOrderByIdUseCase,
  GetOrderMerchantsUseCase,
  GetOrderMerchantsWithProductsUseCase,
  ListOrdersUseCase,
  RequestMerchantFeedbackUseCase,
  UpdateOrderStatusUseCase,
} from '@application/use-cases/order/order.use-case';
import {
  GetMerchantOrdersUseCase,
  GetMerchantStatsUseCase,
  GetRevenueChartUseCase,
  GetTopProductsUseCase,
} from '@application/use-cases/order/order-merchant.use-case';
import {
  SendOrderReminderUseCase,
  SendPersonalizedMerchantReminderUseCase,
  SendSelectedMerchantsReminderUseCase,
} from '@application/use-cases/order/order-reminder.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { PrismaOrderRepository } from '@infrastructure/repositories/prisma-order.repository';
import { PrismaNotificationService } from '@infrastructure/notification/prisma-notification.service';
import {
  MerchantOrderController,
  OrderController,
} from '@interface/controllers/order.controller';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';

@Module({
  controllers: [OrderController, MerchantOrderController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: NOTIFICATION_SERVICE, useClass: PrismaNotificationService },
    ListOrdersUseCase,
    GetOrderByIdUseCase,
    UpdateOrderStatusUseCase,
    DeleteOrderUseCase,
    CheckOrderConfirmationUseCase,
    CheckOrderConfirmationImprovedUseCase,
    RequestMerchantFeedbackUseCase,
    GetOrderMerchantsUseCase,
    GetOrderMerchantsWithProductsUseCase,
    CleanupCanceledOrdersUseCase,
    AutoConfirmDeliveriesUseCase,
    GetMerchantOrdersUseCase,
    GetTopProductsUseCase,
    GetMerchantStatsUseCase,
    GetRevenueChartUseCase,
    SendOrderReminderUseCase,
    SendPersonalizedMerchantReminderUseCase,
    SendSelectedMerchantsReminderUseCase,
    UsersAuthGuard,
    ExpressContractFilter,
  ],
})
export class OrderModule {}
