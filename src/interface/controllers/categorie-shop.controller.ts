import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppException } from '@domain/exceptions/app.exception';
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
  @ApiConsumes('application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Alimentation' },
        description: {
          type: 'string',
          example: 'Produits alimentaires et boissons',
          nullable: true,
        },
      },
    },
  })
  create(@Body() body: CreateCategorieShopHttpDto) {
    const name = body?.name?.trim();
    if (!name) {
      throw AppException.validation('Le champ name est requis');
    }

    return this.createCategorieShop.execute({
      name,
      description: body.description,
    });
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
