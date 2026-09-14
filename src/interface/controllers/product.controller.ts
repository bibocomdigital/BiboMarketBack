import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
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
  type ProductMediaFiles,
  type ProductQuery,
} from '@application/use-cases/product/product.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { ProductUploadFilter } from '@interface/filters/product-upload.filter';
import {
  ProductFileSizeInterceptor,
  ProductMediaInterceptor,
} from '@interface/interceptors/product-media.interceptor';
import {
  OptionalUsersAuthGuard,
  UsersAuthGuard,
  UsersMerchantGuard,
} from '@interface/guards/users-auth.guard';
import { currentUserId } from '@interface/guards/express-auth.guard';

function mediaFiles(request: Request): ProductMediaFiles | undefined {
  const files = request.files as ProductMediaFiles | undefined;
  if (!files || Object.keys(files).length === 0) {
    return undefined;
  }
  return files;
}

@ApiTags('produit')
@UseFilters(ProductUploadFilter, ExpressContractFilter)
@Controller(['produit', 'products'])
export class ProductController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly searchProducts: SearchProductsUseCase,
    private readonly getProductsByCategory: GetProductsByCategoryUseCase,
    private readonly getLatestProducts: GetLatestProductsUseCase,
    private readonly getFeaturedProducts: GetFeaturedProductsUseCase,
    private readonly getProductCategories: GetProductCategoriesUseCase,
    private readonly getMerchantProducts: GetMerchantProductsUseCase,
    private readonly getProductStats: GetProductStatsUseCase,
    private readonly getRelatedProducts: GetRelatedProductsUseCase,
    private readonly getProductById: GetProductByIdUseCase,
    private readonly updateProductWithImages: UpdateProductWithImagesUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly updateProductStock: UpdateProductStockUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
  ) {}

  @Get()
  @UseGuards(OptionalUsersAuthGuard)
  list(
    @Req() request: Request,
    @Query() query: ProductQuery,
  ) {
    return this.listProducts.execute(query, request.user?.id);
  }

  @Get('search')
  @UseGuards(OptionalUsersAuthGuard)
  search(
    @Req() request: Request,
    @Query() query: ProductQuery,
  ) {
    return this.searchProducts.execute(query, request.user?.id);
  }

  @Get('category/:category')
  byCategory(
    @Param('category') category: string,
    @Query() query: ProductQuery,
  ) {
    return this.getProductsByCategory.execute(parseInt(category, 10), query);
  }

  @Get('latest')
  latest(@Query() query: ProductQuery) {
    return this.getLatestProducts.execute(query);
  }

  @Get('featured')
  featured(@Query() query: ProductQuery) {
    return this.getFeaturedProducts.execute(query);
  }

  @Get('categories')
  categories() {
    return this.getProductCategories.execute();
  }

  @Get('merchant/:merchantId')
  merchant(
    @Param('merchantId') merchantId: string,
    @Query() query: ProductQuery,
  ) {
    return this.getMerchantProducts.execute(parseInt(merchantId, 10), query);
  }

  @Get('stats')
  @UseGuards(UsersAuthGuard, UsersMerchantGuard)
  stats(@Req() request: Request) {
    return this.getProductStats.execute(currentUserId(request));
  }

  @Get(':id/related')
  related(@Param('id') id: string, @Query() query: ProductQuery) {
    return this.getRelatedProducts.execute(parseInt(id, 10), query);
  }

  @Get(':id')
  @UseGuards(OptionalUsersAuthGuard)
  findOne(@Req() request: Request, @Param('id') id: string) {
    return this.getProductById.execute(parseInt(id, 10), request.user?.id);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(UsersAuthGuard, UsersMerchantGuard)
  @UseInterceptors(ProductMediaInterceptor, ProductFileSizeInterceptor)
  create(
    @Req() request: Request,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: string | number;
      stock?: string | number;
      videoUrl?: string;
      categorieProdId?: string | number;
      status?: string;
    },
  ) {
    return this.createProduct.execute(currentUserId(request), body, mediaFiles(request));
  }

  @Post('test')
  @HttpCode(201)
  @UseInterceptors(ProductMediaInterceptor, ProductFileSizeInterceptor)
  createTest(
    @Req() request: Request,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: string | number;
      stock?: string | number;
      videoUrl?: string;
      categorieProdId?: string | number;
      status?: string;
    },
  ) {
    return this.createProduct.execute(currentUserId(request), body, mediaFiles(request));
  }

  @Put(':id/update-with-images')
  @UseGuards(UsersAuthGuard)
  @UseInterceptors(ProductMediaInterceptor, ProductFileSizeInterceptor)
  updateWithImages(
    @Req() request: Request,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      categorieProdId?: string | number;
      price?: string | number;
      stock?: string | number;
      videoUrl?: string;
      existingImageUrls?: string;
      imagesToDelete?: string;
    },
  ) {
    return this.updateProductWithImages.execute(
      parseInt(id, 10),
      currentUserId(request),
      body,
      mediaFiles(request),
    );
  }

  @Put(':id')
  @UseGuards(UsersAuthGuard)
  @UseInterceptors(ProductMediaInterceptor, ProductFileSizeInterceptor)
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      price?: string | number;
      stock?: string | number;
      videoUrl?: string;
      categorieProdId?: string | number;
      images?: string[] | string;
    },
  ) {
    return this.updateProduct.execute(parseInt(id, 10), currentUserId(request), body);
  }

  @Patch(':id/stock')
  @UseGuards(UsersAuthGuard)
  updateStock(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { stock?: number | string },
  ) {
    return this.updateProductStock.execute(
      parseInt(id, 10),
      currentUserId(request),
      body.stock,
    );
  }

  @Delete(':id')
  @UseGuards(UsersAuthGuard)
  remove(@Req() request: Request, @Param('id') id: string) {
    return this.deleteProduct.execute(parseInt(id, 10), currentUserId(request));
  }
}
