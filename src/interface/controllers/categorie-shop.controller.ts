import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateCategorieShopUseCase } from '@application/use-cases/categorie-shop/create-categorie-shop.use-case';
import { DeleteCategorieShopUseCase } from '@application/use-cases/categorie-shop/delete-categorie-shop.use-case';
import { GetCategorieShopUseCase } from '@application/use-cases/categorie-shop/get-categorie-shop.use-case';
import { ListCategorieShopsUseCase } from '@application/use-cases/categorie-shop/list-categorie-shops.use-case';
import { UpdateCategorieShopUseCase } from '@application/use-cases/categorie-shop/update-categorie-shop.use-case';
import type {
  CreateCategorieShopHttpDto,
  UpdateCategorieShopHttpDto,
} from '@interface/dto/categorie-shop.http.dto';

@ApiTags('categories-shop')
@Controller('categories-shop')
export class CategorieShopController {
  constructor(
    private readonly createCategorieShop: CreateCategorieShopUseCase,
    private readonly listCategorieShops: ListCategorieShopsUseCase,
    private readonly getCategorieShop: GetCategorieShopUseCase,
    private readonly updateCategorieShop: UpdateCategorieShopUseCase,
    private readonly deleteCategorieShop: DeleteCategorieShopUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer une catégorie de boutique' })
  async create(
    @Body() body: CreateCategorieShopHttpDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.createCategorieShop.execute(body);
      return res.json(data);
    } catch (error) {
      return res.status(400).json({ error });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lister les catégories de boutiques' })
  findAll() {
    return this.listCategorieShops.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une catégorie de boutique' })
  findOne(@Param('id') id: string) {
    return this.getCategorieShop.execute(Number(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour une catégorie de boutique' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCategorieShopHttpDto,
  ) {
    return this.updateCategorieShop.execute(Number(id), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une catégorie de boutique' })
  async remove(@Param('id') id: string) {
    await this.deleteCategorieShop.execute(Number(id));
    return { message: 'Deleted successfully' };
  }
}
