import { Inject, Injectable } from '@nestjs/common';
import type { CategorieProdWriteInput } from '@domain/entities/categorie-prod.entity';
import {
  CATEGORIE_PROD_REPOSITORY,
  type CategorieProdRepository,
} from '@domain/repositories/categorie-prod.repository';

@Injectable()
export class UpdateCategorieProdUseCase {
  constructor(
    @Inject(CATEGORIE_PROD_REPOSITORY)
    private readonly categorieProdRepository: CategorieProdRepository,
  ) {}

  execute(id: number, input: CategorieProdWriteInput) {
    return this.categorieProdRepository.update(id, input);
  }
}
