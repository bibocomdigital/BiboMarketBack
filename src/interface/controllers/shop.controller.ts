import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import type { Request } from 'express';
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
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { UsersAuthGuard } from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

const logoUpload = FileInterceptor('logo', {
  storage: diskStorage({
    destination: 'uploads/temp',
    filename: (_req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, uniqueSuffix + extname(file.originalname));
    },
  }),
});

@ApiTags('shop')
@UseFilters(ExpressContractFilter)
@Controller('shop')
export class ShopController {
  constructor(
    private readonly createShop: CreateShopUseCase,
    private readonly getMyShop: GetMyShopUseCase,
    private readonly getShopMessages: GetShopMessagesUseCase,
    private readonly respondToContact: RespondToContactUseCase,
    private readonly listShops: ListShopsUseCase,
    private readonly getShopProducts: GetShopProductsUseCase,
    private readonly getShopDetails: GetShopDetailsUseCase,
    private readonly contactMerchant: ContactMerchantUseCase,
    private readonly getShopById: GetShopByIdUseCase,
    private readonly updateShop: UpdateShopUseCase,
    private readonly deleteShop: DeleteShopUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  @UseGuards(UsersAuthGuard)
  @UseInterceptors(logoUpload)
  create(
    @Req() request: Request,
    @Body()
    body: {
      name?: string;
      description?: string;
      phoneNumber?: string;
      address?: string;
      categorieShopId?: string | number;
    },
    @UploadedFile() file?: { path: string },
  ) {
    return this.createShop.execute({
      userId: currentUserId(request),
      name: body.name,
      description: body.description,
      phoneNumber: body.phoneNumber,
      address: body.address,
      categorieShopId: body.categorieShopId,
      filePath: file?.path,
    });
  }

  @Get('mine')
  @UseGuards(UsersAuthGuard)
  mine(@Req() request: Request) {
    return this.getMyShop.execute(currentUserId(request));
  }

  @Get('messages')
  @UseGuards(UsersAuthGuard)
  messages(@Req() request: Request) {
    return this.getShopMessages.execute(request.user);
  }

  @Post('contact/:contactId/respond')
  @HttpCode(200)
  @UseGuards(UsersAuthGuard)
  respond(
    @Req() request: Request,
    @Param('contactId') contactId: string,
    @Body() body: { response?: string },
  ) {
    return this.respondToContact.execute(
      parseInt(contactId, 10),
      request.user,
      body.response,
    );
  }

  @Get()
  list() {
    return this.listShops.execute();
  }

  @Get(':shopId/products')
  products(
    @Param('shopId') shopId: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    return this.getShopProducts.execute(parseInt(shopId, 10), query);
  }

  @Get(':id/details')
  details(@Param('id') id: string) {
    return this.getShopDetails.execute(parseInt(id, 10));
  }

  @Post(':shopId/contact')
  @HttpCode(200)
  @UseGuards(UsersAuthGuard)
  contact(
    @Req() request: Request,
    @Param('shopId') shopId: string,
    @Body() body: { subject?: string; message?: string },
  ) {
    return this.contactMerchant.execute(
      parseInt(shopId, 10),
      request.user,
      body,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getShopById.execute(parseInt(id, 10));
  }

  @Put(':id')
  @UseGuards(UsersAuthGuard)
  @UseInterceptors(logoUpload)
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      phoneNumber?: string;
      address?: string;
    },
    @UploadedFile() file?: { path: string },
  ) {
    return this.updateShop.execute(parseInt(id, 10), currentUserId(request), {
      name: body.name,
      description: body.description,
      phoneNumber: body.phoneNumber,
      address: body.address,
      filePath: file?.path,
    });
  }

  @Delete(':id')
  @UseGuards(UsersAuthGuard)
  remove(@Req() request: Request, @Param('id') id: string) {
    return this.deleteShop.execute(parseInt(id, 10), currentUserId(request));
  }
}
