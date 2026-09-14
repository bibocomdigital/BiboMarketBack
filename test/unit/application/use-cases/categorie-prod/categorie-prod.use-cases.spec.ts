import type { CategorieProdRepository } from '@domain/repositories/categorie-prod.repository';
import { DeleteCategorieProdUseCase } from '@application/use-cases/categorie-prod/delete-categorie-prod.use-case';
import { GetCategorieProdUseCase } from '@application/use-cases/categorie-prod/get-categorie-prod.use-case';
import { ListCategorieProdUseCase } from '@application/use-cases/categorie-prod/list-categorie-prod.use-case';
import { UpdateCategorieProdUseCase } from '@application/use-cases/categorie-prod/update-categorie-prod.use-case';

const sample = { id: 1, name: 'Smartphones', categorieShopId: 2 };

describe('CategorieProd use cases', () => {
  it('liste les catégories', async () => {
    const categorieProdRepository: Pick<CategorieProdRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([sample]),
    };
    const useCase = new ListCategorieProdUseCase(
      categorieProdRepository as CategorieProdRepository,
    );

    await expect(useCase.execute()).resolves.toEqual([sample]);
  });

  it('récupère une catégorie par id', async () => {
    const categorieProdRepository: Pick<CategorieProdRepository, 'findById'> = {
      findById: jest.fn().mockResolvedValue(sample),
    };
    const useCase = new GetCategorieProdUseCase(
      categorieProdRepository as CategorieProdRepository,
    );

    await expect(useCase.execute(1)).resolves.toEqual(sample);
    expect(categorieProdRepository.findById).toHaveBeenCalledWith(1);
  });

  it('met à jour une catégorie', async () => {
    const categorieProdRepository: Pick<CategorieProdRepository, 'update'> = {
      update: jest.fn().mockResolvedValue({ ...sample, name: 'Laptops' }),
    };
    const useCase = new UpdateCategorieProdUseCase(
      categorieProdRepository as CategorieProdRepository,
    );

    await expect(useCase.execute(1, { name: 'Laptops' })).resolves.toEqual({
      ...sample,
      name: 'Laptops',
    });
  });

  it('supprime une catégorie', async () => {
    const categorieProdRepository: Pick<CategorieProdRepository, 'delete'> = {
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new DeleteCategorieProdUseCase(
      categorieProdRepository as CategorieProdRepository,
    );

    await expect(useCase.execute(1)).resolves.toBeUndefined();
    expect(categorieProdRepository.delete).toHaveBeenCalledWith(1);
  });
});
