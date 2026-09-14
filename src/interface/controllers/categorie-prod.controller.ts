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
  async create(
    @Body() body: CreateCategorieProdHttpDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.createCategorieProd.execute(body);
      return res.json(data);
    } catch (error) {
      return res.status(400).json({ error });
    }
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
