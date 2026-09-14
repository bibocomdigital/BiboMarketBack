import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
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
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

@ApiTags('orders')
@UseFilters(ExpressContractFilter)
@UseGuards(UsersAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrderById: GetOrderByIdUseCase,
    private readonly updateOrderStatus: UpdateOrderStatusUseCase,
    private readonly deleteOrder: DeleteOrderUseCase,
    private readonly checkConfirmation: CheckOrderConfirmationUseCase,
    private readonly checkConfirmationV2: CheckOrderConfirmationImprovedUseCase,
    private readonly requestFeedback: RequestMerchantFeedbackUseCase,
    private readonly getOrderMerchants: GetOrderMerchantsUseCase,
    private readonly getOrderMerchantsDetails: GetOrderMerchantsWithProductsUseCase,
    private readonly cleanupCanceled: CleanupCanceledOrdersUseCase,
    private readonly autoConfirm: AutoConfirmDeliveriesUseCase,
    private readonly sendReminder: SendOrderReminderUseCase,
    private readonly sendPersonalizedReminder: SendPersonalizedMerchantReminderUseCase,
    private readonly sendSelectedReminders: SendSelectedMerchantsReminderUseCase,
  ) {}

  @Get()
  list(@Req() request: Request) {
    return this.listOrders.execute(currentUserId(request));
  }

  @Post('auto-confirm-deliveries')
  @HttpCode(200)
  autoConfirmDeliveries() {
    return this.autoConfirm.execute();
  }

  @Post('cleanup-canceled')
  @HttpCode(200)
  cleanup() {
    return this.cleanupCanceled.execute();
  }

  @Get(':orderId/check-confirmation')
  check(@Req() request: Request, @Param('orderId') orderId: string) {
    return this.checkConfirmation.execute(
      parseInt(orderId, 10),
      currentUserId(request),
    );
  }

  @Get(':orderId/check-confirmation-v2')
  checkV2(@Req() request: Request, @Param('orderId') orderId: string) {
    return this.checkConfirmationV2.execute(
      parseInt(orderId, 10),
      currentUserId(request),
    );
  }

  @Post(':orderId/send-reminder')
  @HttpCode(200)
  reminder(
    @Req() request: Request,
    @Param('orderId') orderId: string,
    @Body() body: { customMessage?: string },
  ) {
    return this.sendReminder.execute(
      parseInt(orderId, 10),
      currentUserId(request),
      body.customMessage,
    );
  }

  @Get(':orderId/request-feedback')
  feedback(@Req() request: Request, @Param('orderId') orderId: string) {
    return this.requestFeedback.execute(
      parseInt(orderId, 10),
      currentUserId(request),
    );
  }

  @Get(':orderId/merchants-details')
  merchantsDetails(@Req() request: Request, @Param('orderId') orderId: string) {
    return this.getOrderMerchantsDetails.execute(
      parseInt(orderId, 10),
      currentUserId(request),
    );
  }

  @Get(':orderId/merchants')
  merchants(@Req() request: Request, @Param('orderId') orderId: string) {
    return this.getOrderMerchants.execute(
      parseInt(orderId, 10),
      currentUserId(request),
    );
  }

  @Post(':orderId/remind-merchant/:merchantId')
  @HttpCode(200)
  remindMerchant(
    @Req() request: Request,
    @Param('orderId') orderId: string,
    @Param('merchantId') merchantId: string,
    @Body() body: { customMessage?: string; includeImages?: boolean | string },
  ) {
    return this.sendPersonalizedReminder.execute(
      parseInt(orderId, 10),
      parseInt(merchantId, 10),
      currentUserId(request),
      body,
    );
  }

  @Post(':orderId/remind-selected-merchants')
  @HttpCode(200)
  remindSelected(
    @Req() request: Request,
    @Param('orderId') orderId: string,
    @Body()
    body: {
      merchantIds?: unknown;
      customMessage?: string;
      includeImages?: boolean | string;
    },
  ) {
    return this.sendSelectedReminders.execute(
      parseInt(orderId, 10),
      currentUserId(request),
      body.merchantIds,
      body.customMessage,
      body.includeImages,
    );
  }

  @Patch(':orderId/status')
  status(
    @Req() request: Request,
    @Param('orderId') orderId: string,
    @Body() body: { status?: string },
  ) {
    return this.updateOrderStatus.execute(
      parseInt(orderId, 10),
      currentUserId(request),
      request.user?.role,
      body.status ?? '',
    );
  }

  @Get(':orderId')
  findOne(@Req() request: Request, @Param('orderId') orderId: string) {
    return this.getOrderById.execute(
      parseInt(orderId, 10),
      currentUserId(request),
    );
  }

  @Delete(':orderId')
  remove(@Req() request: Request, @Param('orderId') orderId: string) {
    return this.deleteOrder.execute(
      parseInt(orderId, 10),
      currentUserId(request),
      request.user?.role,
    );
  }
}

@ApiTags('merchant')
@UseFilters(ExpressContractFilter)
@UseGuards(UsersAuthGuard)
@Controller('merchant')
export class MerchantOrderController {
  constructor(
    private readonly getMerchantOrders: GetMerchantOrdersUseCase,
    private readonly getMerchantStats: GetMerchantStatsUseCase,
    private readonly getRevenueChart: GetRevenueChartUseCase,
    private readonly getTopProducts: GetTopProductsUseCase,
  ) {}

  @Get('orders')
  orders(@Req() request: Request) {
    return this.getMerchantOrders.execute(currentUserId(request));
  }

  @Get('stats')
  stats(@Req() request: Request) {
    return this.getMerchantStats.execute(currentUserId(request));
  }

  @Get('revenue-chart')
  chart(@Req() request: Request, @Query('days') days?: string) {
    return this.getRevenueChart.execute(currentUserId(request), days);
  }

  @Get('top-products')
  top(@Req() request: Request) {
    return this.getTopProducts.execute(currentUserId(request));
  }
}
