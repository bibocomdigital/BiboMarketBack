import { Test, TestingModule } from '@nestjs/testing';
import { CategorieProdController } from '@interface/controllers/categorie-prod.controller';
import { CreateCategorieProdUseCase } from '@application/use-cases/categorie-prod/create-categorie-prod.use-case';
import { DeleteCategorieProdUseCase } from '@application/use-cases/categorie-prod/delete-categorie-prod.use-case';
import { GetCategorieProdUseCase } from '@application/use-cases/categorie-prod/get-categorie-prod.use-case';
import { ListCategorieProdUseCase } from '@application/use-cases/categorie-prod/list-categorie-prod.use-case';
import { UpdateCategorieProdUseCase } from '@application/use-cases/categorie-prod/update-categorie-prod.use-case';

describe('CategorieProdController', () => {
  let controller: CategorieProdController;
  const createCategorieProd = { execute: jest.fn() };
  const listCategorieProd = { execute: jest.fn() };
  const getCategorieProd = { execute: jest.fn() };
  const updateCategorieProd = { execute: jest.fn() };
  const deleteCategorieProd = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategorieProdController],
      providers: [
        { provide: CreateCategorieProdUseCase, useValue: createCategorieProd },
        { provide: ListCategorieProdUseCase, useValue: listCategorieProd },
        { provide: GetCategorieProdUseCase, useValue: getCategorieProd },
        { provide: UpdateCategorieProdUseCase, useValue: updateCategorieProd },
        { provide: DeleteCategorieProdUseCase, useValue: deleteCategorieProd },
      ],
    }).compile();

    controller = module.get(CategorieProdController);
  });

  it('create propage l’erreur du use case', async () => {
    const error = { code: 'P2002' };
    createCategorieProd.execute.mockRejectedValue(error);

    await expect(
      controller.create({ name: 'Smartphones', categorieShopId: 1 }),
    ).rejects.toEqual(error);
  });

  it('delete renvoie le message Express historique', async () => {
    deleteCategorieProd.execute.mockResolvedValue(undefined);

    await expect(controller.remove('3')).resolves.toEqual({
      message: 'Deleted successfully',
    });
    expect(deleteCategorieProd.execute).toHaveBeenCalledWith(3);
  });

  it('findOne convertit l’id en nombre', async () => {
    getCategorieProd.execute.mockResolvedValue({
      id: 2,
      name: 'Laptops',
      categorieShopId: 1,
    });

    await controller.findOne('2');

    expect(getCategorieProd.execute).toHaveBeenCalledWith(2);
  });
});
