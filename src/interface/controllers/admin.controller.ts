import {
  Body,
  Controller,
  Delete,
  Get,
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
import { GetAdminDashboardUseCase } from '@application/use-cases/admin/admin-dashboard.use-case';
import {
  CreateAdminUserUseCase,
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
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';
import { assertOperator, assertSuperAdmin } from '@interface/guards/staff-access';

type AdminQuery = Record<string, string | undefined>;

@ApiTags('admin')
@UseFilters(ExpressContractFilter)
@UseGuards(UsersAuthGuard, UsersAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly getDashboard: GetAdminDashboardUseCase,
    private readonly listUsers: ListAdminUsersUseCase,
    private readonly createUserAccount: CreateAdminUserUseCase,
    private readonly getUser: GetAdminUserUseCase,
    private readonly updateUser: UpdateAdminUserUseCase,
    private readonly deleteUser: DeleteAdminUserUseCase,
    private readonly listShops: ListAdminShopsUseCase,
    private readonly getShop: GetAdminShopUseCase,
    private readonly updateShop: UpdateAdminShopUseCase,
    private readonly deleteShop: DeleteAdminShopUseCase,
    private readonly listFeedbacks: ListAdminFeedbacksUseCase,
    private readonly listProducts: ListAdminProductsUseCase,
    private readonly getProduct: GetAdminProductUseCase,
    private readonly updateProduct: UpdateAdminProductUseCase,
    private readonly deleteProduct: DeleteAdminProductUseCase,
    private readonly listOrders: ListAdminOrdersUseCase,
    private readonly getOrder: GetAdminOrderUseCase,
    private readonly updateOrderStatus: UpdateAdminOrderStatusUseCase,
  ) {}

  @Get('dashboard')
  dashboard(
    @Req() request: Request,
    @Query('months') months?: string,
    @Query('lowStockThreshold') lowStockThreshold?: string,
  ) {
    assertOperator(request.user?.role);
    return this.getDashboard.execute(months, lowStockThreshold);
  }

  @Get('users')
  users(@Req() request: Request, @Query() query: AdminQuery) {
    assertOperator(request.user?.role);
    return this.listUsers.execute(query);
  }

  @Post('users')
  addUser(
    @Req() request: Request,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      email?: string;
      role?: string;
    },
  ) {
    assertSuperAdmin(request.user?.role);
    return this.createUserAccount.execute(body);
  }

  @Get('users/:id')
  user(@Req() request: Request, @Param('id') id: string) {
    assertOperator(request.user?.role);
    return this.getUser.execute(parseInt(id, 10));
  }

  @Patch('users/:id')
  patchUser(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { role?: string; isVerified?: boolean },
  ) {
    assertOperator(request.user?.role);
    return this.updateUser.execute(parseInt(id, 10), body, request.user?.role);
  }

  @Delete('users/:id')
  removeUser(@Req() request: Request, @Param('id') id: string) {
    assertOperator(request.user?.role);
    return this.deleteUser.execute(
      parseInt(id, 10),
      currentUserId(request),
      request.user?.role,
    );
  }

  @Get('shops')
  shops(@Query() query: AdminQuery) {
    return this.listShops.execute(query);
  }

  @Get('shops/:id')
  shop(@Param('id') id: string) {
    return this.getShop.execute(parseInt(id, 10));
  }

  @Patch('shops/:id')
  patchShop(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { status?: boolean | string; verifiedBadge?: boolean | string },
  ) {
    if (body.verifiedBadge !== undefined) {
      assertOperator(request.user?.role);
    }
    return this.updateShop.execute(parseInt(id, 10), body);
  }

  @Delete('shops/:id')
  removeShop(@Req() request: Request, @Param('id') id: string) {
    assertOperator(request.user?.role);
    return this.deleteShop.execute(parseInt(id, 10));
  }

  @Get('products')
  products(@Query() query: AdminQuery) {
    return this.listProducts.execute(query);
  }

  @Get('products/:id')
  product(@Param('id') id: string) {
    return this.getProduct.execute(parseInt(id, 10));
  }

  @Patch('products/:id')
  patchProduct(
    @Param('id') id: string,
    @Body() body: { status?: string; stock?: number | string },
  ) {
    return this.updateProduct.execute(parseInt(id, 10), body);
  }

  @Delete('products/:id')
  removeProduct(@Param('id') id: string) {
    return this.deleteProduct.execute(parseInt(id, 10));
  }

  @Get('orders')
  orders(@Req() request: Request, @Query() query: AdminQuery) {
    assertOperator(request.user?.role);
    return this.listOrders.execute(query);
  }

  @Get('orders/:id')
  order(@Req() request: Request, @Param('id') id: string) {
    assertOperator(request.user?.role);
    return this.getOrder.execute(parseInt(id, 10));
  }

  @Patch('orders/:id/status')
  patchOrderStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { status?: string },
  ) {
    assertOperator(request.user?.role);
    return this.updateOrderStatus.execute(parseInt(id, 10), body.status ?? '');
  }

  @Get('feedbacks')
  feedbacks(@Req() request: Request, @Query() query: AdminQuery) {
    assertOperator(request.user?.role);
    return this.listFeedbacks.execute(query);
  }
}
