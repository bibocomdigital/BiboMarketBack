import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORIE_PROD_REPOSITORY,
  type CategorieProdRepository,
} from '@domain/repositories/categorie-prod.repository';

@Injectable()
export class ListCategorieProdUseCase {
  constructor(
    @Inject(CATEGORIE_PROD_REPOSITORY)
    private readonly categorieProdRepository: CategorieProdRepository,
  ) {}

  execute() {
    return this.categorieProdRepository.findAll();
  }
}
