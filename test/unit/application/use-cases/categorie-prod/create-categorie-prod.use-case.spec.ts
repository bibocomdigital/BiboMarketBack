import { CATEGORIE_PROD_REPOSITORY } from '@domain/repositories/categorie-prod.repository';
import type { CategorieProdRepository } from '@domain/repositories/categorie-prod.repository';
import { CreateCategorieProdUseCase } from '@application/use-cases/categorie-prod/create-categorie-prod.use-case';

describe('CreateCategorieProdUseCase', () => {
  it('délègue la création au repository', async () => {
    const created = { id: 1, name: 'Smartphones', categorieShopId: 2 };
    const categorieProdRepository: Pick<CategorieProdRepository, 'create'> = {
      create: jest.fn().mockResolvedValue(created),
    };

    const useCase = new CreateCategorieProdUseCase(
      categorieProdRepository as CategorieProdRepository,
    );

    await expect(
      useCase.execute({ name: 'Smartphones', categorieShopId: 2 }),
    ).resolves.toEqual(created);
    expect(categorieProdRepository.create).toHaveBeenCalledWith({
      name: 'Smartphones',
      categorieShopId: 2,
    });
  });
});

describe('CATEGORIE_PROD_REPOSITORY', () => {
  it('expose un token d’injection stable', () => {
    expect(CATEGORIE_PROD_REPOSITORY).toBeDefined();
  });
});
