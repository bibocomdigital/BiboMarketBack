import { Module } from '@nestjs/common';
import { CATEGORIE_PROD_REPOSITORY } from '@domain/repositories/categorie-prod.repository';
import { CreateCategorieProdUseCase } from '@application/use-cases/categorie-prod/create-categorie-prod.use-case';
import { DeleteCategorieProdUseCase } from '@application/use-cases/categorie-prod/delete-categorie-prod.use-case';
import { GetCategorieProdUseCase } from '@application/use-cases/categorie-prod/get-categorie-prod.use-case';
import { ListCategorieProdUseCase } from '@application/use-cases/categorie-prod/list-categorie-prod.use-case';
import { UpdateCategorieProdUseCase } from '@application/use-cases/categorie-prod/update-categorie-prod.use-case';
import { PrismaCategorieProdRepository } from '@infrastructure/repositories/prisma-categorie-prod.repository';
import { CategorieProdController } from '@interface/controllers/categorie-prod.controller';

@Module({
  controllers: [CategorieProdController],
  providers: [
    {
      provide: CATEGORIE_PROD_REPOSITORY,
      useClass: PrismaCategorieProdRepository,
    },
    CreateCategorieProdUseCase,
    ListCategorieProdUseCase,
    GetCategorieProdUseCase,
    UpdateCategorieProdUseCase,
    DeleteCategorieProdUseCase,
  ],
})
export class CategorieProdModule {}
