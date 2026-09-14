import { CATEGORIE_SHOP_REPOSITORY } from '@domain/repositories/categorie-shop.repository';
import type { CategorieShopRepository } from '@domain/repositories/categorie-shop.repository';
import { CreateCategorieShopUseCase } from '@application/use-cases/categorie-shop/create-categorie-shop.use-case';

describe('CreateCategorieShopUseCase', () => {
  it('délègue la création au repository', async () => {
    const created = { id: 1, name: 'Électronique', description: null };
    const categorieShopRepository: Pick<CategorieShopRepository, 'create'> = {
      create: jest.fn().mockResolvedValue(created),
    };

    const useCase = new CreateCategorieShopUseCase(
      categorieShopRepository as CategorieShopRepository,
    );

    await expect(useCase.execute({ name: 'Électronique' })).resolves.toEqual(
      created,
    );
    expect(categorieShopRepository.create).toHaveBeenCalledWith({
      name: 'Électronique',
    });
  });
});

describe('CATEGORIE_SHOP_REPOSITORY', () => {
  it('expose un token d’injection stable', () => {
    expect(CATEGORIE_SHOP_REPOSITORY).toBeDefined();
  });
});
