import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CheckoutBadgeUseCase,
  ConfirmBadgePaymentUseCase,
  GetBadgeSettingsUseCase,
  GetMyBadgeUseCase,
  UpdateBadgeSettingsUseCase,
} from '@application/use-cases/badge/badge.use-case';
import { ShopPlanUseCase } from '@application/use-cases/shop/shop-plan.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { currentUserId } from '@interface/guards/express-auth.guard';
import { assertOperator, assertSuperAdmin } from '@interface/guards/staff-access';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';

@ApiTags('badges')
@UseFilters(ExpressContractFilter)
@Controller('badges')
export class BadgeController {
  constructor(
    private readonly getMine: GetMyBadgeUseCase,
    private readonly checkout: CheckoutBadgeUseCase,
    private readonly confirmPayment: ConfirmBadgePaymentUseCase,
    private readonly plans: ShopPlanUseCase,
  ) {}

  @Get('plans')
  shopPlans() {
    return this.plans.listPublic();
  }

  @UseGuards(UsersAuthGuard)
  @Get('me')
  mine(@Req() request: Request) {
    return this.getMine.execute(currentUserId(request));
  }

  @UseGuards(UsersAuthGuard)
  @Post('checkout')
  startCheckout(@Req() request: Request) {
    return this.checkout.execute(currentUserId(request));
  }

  @Post('confirm')
  confirm(@Body() body: { token?: string }) {
    return this.confirmPayment.execute(body.token ?? '');
  }

  @Post('ipn')
  ipn(@Body() body: Record<string, unknown>) {
    const token = readPaydunyaToken(body);
    if (!token) return { received: true };
    return this.confirmPayment.execute(token);
  }
}

@ApiTags('admin')
@UseFilters(ExpressContractFilter)
@UseGuards(UsersAuthGuard, UsersAdminGuard)
@Controller('admin/badges')
export class AdminBadgeController {
  constructor(
    private readonly getSettings: GetBadgeSettingsUseCase,
    private readonly updateSettings: UpdateBadgeSettingsUseCase,
    private readonly confirmPayment: ConfirmBadgePaymentUseCase,
    private readonly plans: ShopPlanUseCase,
  ) {}

  @Get('plans')
  listPlans(@Req() request: Request) {
    assertSuperAdmin(request.user?.role);
    return this.plans.listAll();
  }

  @Post('plans')
  createPlan(@Req() request: Request, @Body() body: ShopPlanBody) {
    assertSuperAdmin(request.user?.role);
    return this.plans.create(body);
  }

  @Patch('plans/:id')
  updatePlan(@Req() request: Request, @Param('id') id: string, @Body() body: ShopPlanBody) {
    assertSuperAdmin(request.user?.role);
    return this.plans.update(parseInt(id, 10), body);
  }

  @Delete('plans/:id')
  deletePlan(@Req() request: Request, @Param('id') id: string) {
    assertSuperAdmin(request.user?.role);
    return this.plans.remove(parseInt(id, 10));
  }

  @Get('settings')
  settings(@Req() request: Request) {
    assertSuperAdmin(request.user?.role);
    return this.getSettings.execute();
  }

  @Patch('settings')
  patchSettings(
    @Req() request: Request,
    @Body()
    body: {
      priceCfa?: number;
      supplierPriceCfa?: number;
      durationDays?: number;
      graceDays?: number;
      saleOpen?: boolean;
    },
  ) {
    assertSuperAdmin(request.user?.role);
    return this.updateSettings.execute(body);
  }

  @Post(':userId/grant')
  grant(@Req() request: Request, @Param('userId') userId: string) {
    assertOperator(request.user?.role);
    return this.confirmPayment.grant(parseInt(userId, 10));
  }

  @Post(':userId/revoke')
  revoke(@Req() request: Request, @Param('userId') userId: string) {
    assertOperator(request.user?.role);
    return this.confirmPayment.revoke(parseInt(userId, 10));
  }
}

type ShopPlanBody = {
  name?: string;
  priceCfa?: number;
  durationDays?: number;
  maxProducts?: number;
  active?: boolean;
  sortOrder?: number;
};

function readPaydunyaToken(body: Record<string, unknown>): string {
  const data = body.data;
  if (data && typeof data === 'object') {
    const invoice = (data as { invoice?: { token?: unknown } }).invoice;
    if (typeof invoice?.token === 'string') return invoice.token;
    const direct = (data as { token?: unknown }).token;
    if (typeof direct === 'string') return direct;
  }
  if (typeof body.token === 'string') return body.token;
  return '';
}
