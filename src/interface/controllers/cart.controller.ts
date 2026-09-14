import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AddToCartUseCase,
  ClearCartUseCase,
  CreateOrderFromCartUseCase,
  GetCartUseCase,
  RemoveFromCartUseCase,
  ShareCartUseCase,
  UpdateCartItemUseCase,
} from '@application/use-cases/cart/cart.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

@ApiTags('cart')
@UseFilters(ExpressContractFilter)
@UseGuards(UsersAuthGuard)
@Controller('cart')
export class CartController {
  constructor(
    private readonly addToCart: AddToCartUseCase,
    private readonly createOrderFromCart: CreateOrderFromCartUseCase,
    private readonly getCart: GetCartUseCase,
    private readonly updateCartItem: UpdateCartItemUseCase,
    private readonly removeFromCart: RemoveFromCartUseCase,
    private readonly clearCart: ClearCartUseCase,
    private readonly shareCart: ShareCartUseCase,
  ) {}

  @Post('order')
  @HttpCode(200)
  order(@Req() request: Request, @Body() body: { message?: string }) {
    return this.createOrderFromCart.execute(
      currentUserId(request),
      body.message,
    );
  }

  @Post('share/whatsapp')
  @HttpCode(200)
  share(@Req() request: Request, @Body() body: { message?: string }) {
    return this.shareCart.execute(currentUserId(request), body.message);
  }

  @Post()
  @HttpCode(200)
  add(
    @Req() request: Request,
    @Body() body: { productId?: number | string; quantity?: number | string },
  ) {
    return this.addToCart.execute(
      currentUserId(request),
      body.productId,
      body.quantity ?? 1,
    );
  }

  @Get()
  find(@Req() request: Request) {
    return this.getCart.execute(currentUserId(request));
  }

  @Put('items/:itemId')
  update(
    @Req() request: Request,
    @Param('itemId') itemId: string,
    @Body() body: { quantity?: number },
  ) {
    return this.updateCartItem.execute(
      currentUserId(request),
      parseInt(itemId, 10),
      Number(body.quantity),
    );
  }

  @Delete('items/:itemId')
  remove(@Req() request: Request, @Param('itemId') itemId: string) {
    return this.removeFromCart.execute(
      currentUserId(request),
      parseInt(itemId, 10),
    );
  }

  @Delete()
  clear(@Req() request: Request) {
    return this.clearCart.execute(currentUserId(request));
  }
}
