import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from '@interface/controllers/admin.controller';
import { GetAdminDashboardUseCase } from '@application/use-cases/admin/admin-dashboard.use-case';
import {
  DeleteAdminUserUseCase,
  GetAdminUserUseCase,
  ListAdminUsersUseCase,
  UpdateAdminUserUseCase,
} from '@application/use-cases/admin/admin-users.use-case';
import {
  DeleteAdminShopUseCase,
  GetAdminShopUseCase,
  ListAdminFeedbacksUseCase,
  ListAdminShopsUseCase,
  UpdateAdminShopUseCase,
} from '@application/use-cases/admin/admin-shops.use-case';
import {
  DeleteAdminProductUseCase,
  GetAdminProductUseCase,
  ListAdminProductsUseCase,
  UpdateAdminProductUseCase,
} from '@application/use-cases/admin/admin-products.use-case';
import {
  GetAdminOrderUseCase,
  ListAdminOrdersUseCase,
  UpdateAdminOrderStatusUseCase,
} from '@application/use-cases/admin/admin-orders.use-case';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';

describe('AdminController', () => {
  let controller: AdminController;
  const getDashboard = { execute: jest.fn() };
  const listUsers = { execute: jest.fn() };
  const updateShop = { execute: jest.fn() };
  const updateOrderStatus = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: GetAdminDashboardUseCase, useValue: getDashboard },
        { provide: ListAdminUsersUseCase, useValue: listUsers },
        { provide: GetAdminUserUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateAdminUserUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteAdminUserUseCase, useValue: { execute: jest.fn() } },
        { provide: ListAdminShopsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAdminShopUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateAdminShopUseCase, useValue: updateShop },
        { provide: DeleteAdminShopUseCase, useValue: { execute: jest.fn() } },
        { provide: ListAdminFeedbacksUseCase, useValue: { execute: jest.fn() } },
        { provide: ListAdminProductsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAdminProductUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateAdminProductUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteAdminProductUseCase, useValue: { execute: jest.fn() } },
        { provide: ListAdminOrdersUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAdminOrderUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateAdminOrderStatusUseCase, useValue: updateOrderStatus },
      ],
    })
      .overrideGuard(UsersAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UsersAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminController);
  });

  it('délègue le dashboard avec months et lowStockThreshold', async () => {
    getDashboard.execute.mockResolvedValue({ kpis: { totalUsers: 3 } });

    const actor = { user: { role: 'ADMIN' } } as never;

    await expect(controller.dashboard(actor, '12', '10')).resolves.toEqual({
      kpis: { totalUsers: 3 },
    });
    expect(getDashboard.execute).toHaveBeenCalledWith('12', '10');
  });

  it('délègue la vérification d’une boutique', async () => {
    updateShop.execute.mockResolvedValue({ message: 'Boutique mise à jour' });

    await controller.patchShop({ user: { role: 'ADMIN' } } as never, '10', {
      verifiedBadge: true,
    });
    expect(updateShop.execute).toHaveBeenCalledWith(10, { verifiedBadge: true });
  });

  it('délègue la mise à jour du statut d’une commande', async () => {
    updateOrderStatus.execute.mockResolvedValue({ message: 'ok' });

    await controller.patchOrderStatus({ user: { role: 'ADMIN' } } as never, '3', {
      status: 'CONFIRMED',
    });
    expect(updateOrderStatus.execute).toHaveBeenCalledWith(3, 'CONFIRMED');
  });
});
