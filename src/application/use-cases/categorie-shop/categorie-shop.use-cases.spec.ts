import type { CategorieShopRepository } from '@domain/repositories/categorie-shop.repository';
import { DeleteCategorieShopUseCase } from './delete-categorie-shop.use-case';
import { GetCategorieShopUseCase } from './get-categorie-shop.use-case';
import { ListCategorieShopsUseCase } from './list-categorie-shops.use-case';
import { UpdateCategorieShopUseCase } from './update-categorie-shop.use-case';

const sample = { id: 1, name: 'Électronique', description: null };

describe('CategorieShop use cases', () => {
  it('liste les catégories', async () => {
    const categorieShopRepository: Pick<CategorieShopRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([sample]),
    };
    const useCase = new ListCategorieShopsUseCase(
      categorieShopRepository as CategorieShopRepository,
    );

    await expect(useCase.execute()).resolves.toEqual([sample]);
  });

  it('récupère une catégorie par id', async () => {
    const categorieShopRepository: Pick<CategorieShopRepository, 'findById'> = {
      findById: jest.fn().mockResolvedValue(sample),
    };
    const useCase = new GetCategorieShopUseCase(
      categorieShopRepository as CategorieShopRepository,
    );

    await expect(useCase.execute(1)).resolves.toEqual(sample);
    expect(categorieShopRepository.findById).toHaveBeenCalledWith(1);
  });

  it('met à jour une catégorie', async () => {
    const categorieShopRepository: Pick<CategorieShopRepository, 'update'> = {
      update: jest.fn().mockResolvedValue({ ...sample, name: 'Mode' }),
    };
    const useCase = new UpdateCategorieShopUseCase(
      categorieShopRepository as CategorieShopRepository,
    );

    await expect(useCase.execute(1, { name: 'Mode' })).resolves.toEqual({
      ...sample,
      name: 'Mode',
    });
  });

  it('supprime une catégorie', async () => {
    const categorieShopRepository: Pick<CategorieShopRepository, 'delete'> = {
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new DeleteCategorieShopUseCase(
      categorieShopRepository as CategorieShopRepository,
    );

    await expect(useCase.execute(1)).resolves.toBeUndefined();
    expect(categorieShopRepository.delete).toHaveBeenCalledWith(1);
  });
});
