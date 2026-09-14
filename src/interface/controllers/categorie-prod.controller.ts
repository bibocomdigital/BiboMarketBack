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
import { CreateCategorieProdUseCase } from '@application/use-cases/categorie-prod/create-categorie-prod.use-case';
import { DeleteCategorieProdUseCase } from '@application/use-cases/categorie-prod/delete-categorie-prod.use-case';
import { GetCategorieProdUseCase } from '@application/use-cases/categorie-prod/get-categorie-prod.use-case';
import { ListCategorieProdUseCase } from '@application/use-cases/categorie-prod/list-categorie-prod.use-case';
import { UpdateCategorieProdUseCase } from '@application/use-cases/categorie-prod/update-categorie-prod.use-case';
import type {
  CreateCategorieProdHttpDto,
  UpdateCategorieProdHttpDto,
} from '@interface/dto/categorie-prod.http.dto';

@ApiTags('categories-produit')
@Controller('categories-produit')
export class CategorieProdController {
  constructor(
    private readonly createCategorieProd: CreateCategorieProdUseCase,
    private readonly listCategorieProd: ListCategorieProdUseCase,
    private readonly getCategorieProd: GetCategorieProdUseCase,
    private readonly updateCategorieProd: UpdateCategorieProdUseCase,
    private readonly deleteCategorieProd: DeleteCategorieProdUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer une catégorie de produit' })
  @ApiConsumes('application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'categorieShopId'],
      properties: {
        name: { type: 'string', example: 'Céréales' },
        categorieShopId: { type: 'integer', example: 1 },
      },
    },
  })
  create(@Body() body: CreateCategorieProdHttpDto) {
    const name = body?.name?.trim();
    const categorieShopId = Number(body?.categorieShopId);
    if (!name || !Number.isFinite(categorieShopId)) {
      throw AppException.validation(
        'Les champs name et categorieShopId sont requis',
      );
    }

    return this.createCategorieProd.execute({
      name,
      categorieShopId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lister les catégories de produits' })
  findAll() {
    return this.listCategorieProd.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une catégorie de produit' })
  findOne(@Param('id') id: string) {
    return this.getCategorieProd.execute(Number(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour une catégorie de produit' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCategorieProdHttpDto,
  ) {
    return this.updateCategorieProd.execute(Number(id), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une catégorie de produit' })
  async remove(@Param('id') id: string) {
    await this.deleteCategorieProd.execute(Number(id));
    return { message: 'Deleted successfully' };
  }
}
