import { Test, TestingModule } from '@nestjs/testing';
import { CategorieShopController } from '@interface/controllers/categorie-shop.controller';
import { CreateCategorieShopUseCase } from '@application/use-cases/categorie-shop/create-categorie-shop.use-case';
import { DeleteCategorieShopUseCase } from '@application/use-cases/categorie-shop/delete-categorie-shop.use-case';
import { GetCategorieShopUseCase } from '@application/use-cases/categorie-shop/get-categorie-shop.use-case';
import { ListCategorieShopsUseCase } from '@application/use-cases/categorie-shop/list-categorie-shops.use-case';
import { UpdateCategorieShopUseCase } from '@application/use-cases/categorie-shop/update-categorie-shop.use-case';
import { AppException } from '@domain/exceptions/app.exception';

describe('CategorieShopController', () => {
  let controller: CategorieShopController;
  const createCategorieShop = { execute: jest.fn() };
  const listCategorieShops = { execute: jest.fn() };
  const getCategorieShop = { execute: jest.fn() };
  const updateCategorieShop = { execute: jest.fn() };
  const deleteCategorieShop = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategorieShopController],
      providers: [
        { provide: CreateCategorieShopUseCase, useValue: createCategorieShop },
        { provide: ListCategorieShopsUseCase, useValue: listCategorieShops },
        { provide: GetCategorieShopUseCase, useValue: getCategorieShop },
        { provide: UpdateCategorieShopUseCase, useValue: updateCategorieShop },
        { provide: DeleteCategorieShopUseCase, useValue: deleteCategorieShop },
      ],
    }).compile();

    controller = module.get(CategorieShopController);
  });

  it('create propage l’erreur du use case', async () => {
    const error = { code: 'P2002' };
    createCategorieShop.execute.mockRejectedValue(error);

    await expect(controller.create({ name: 'Mode' })).rejects.toEqual(error);
  });

  it('create lève VALIDATION_FAILED si name est absent', () => {
    expect(() => controller.create(undefined as never)).toThrow(AppException);
    expect(createCategorieShop.execute).not.toHaveBeenCalled();
  });

  it('delete renvoie le message Express historique', async () => {
    deleteCategorieShop.execute.mockResolvedValue(undefined);

    await expect(controller.remove('3')).resolves.toEqual({
      message: 'Deleted successfully',
    });
    expect(deleteCategorieShop.execute).toHaveBeenCalledWith(3);
  });

  it('findOne convertit l’id en nombre', async () => {
    getCategorieShop.execute.mockResolvedValue({
      id: 2,
      name: 'Mode',
      description: null,
    });

    await controller.findOne('2');

    expect(getCategorieShop.execute).toHaveBeenCalledWith(2);
  });
});
