import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { AdminRepository } from '@domain/repositories/admin.repository';
import {
  DeleteAdminUserUseCase,
  ListAdminUsersUseCase,
  UpdateAdminUserUseCase,
} from '@application/use-cases/admin/admin-users.use-case';
import {
  DeleteAdminShopUseCase,
  UpdateAdminShopUseCase,
} from '@application/use-cases/admin/admin-shops.use-case';
import { DeleteAdminProductUseCase } from '@application/use-cases/admin/admin-products.use-case';
import { UpdateAdminOrderStatusUseCase } from '@application/use-cases/admin/admin-orders.use-case';
import type { NotificationServicePort } from '@application/ports/output/notification.port';

function adminRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    findUsers: jest.fn().mockResolvedValue({ users: [{ id: 1 }], total: 1 }),
    findUserById: jest.fn().mockResolvedValue({ id: 2, role: 'CLIENT' }),
    updateUser: jest.fn().mockResolvedValue({ id: 2, role: 'MERCHANT' }),
    deleteUser: jest.fn(),
    countUserDependencies: jest.fn().mockResolvedValue({
      shop: 0,
      orders: 0,
      products: 0,
    }),
    findShopById: jest.fn().mockResolvedValue({
      id: 10,
      name: 'Boutique Ndiaye',
      verifiedBadge: false,
      status: true,
      userId: 4,
      owner: { id: 4 },
    }),
    updateShop: jest.fn().mockResolvedValue({ id: 10, verifiedBadge: true }),
    countShopOrderItems: jest.fn().mockResolvedValue(0),
    deleteShopCascade: jest.fn(),
    findProductById: jest.fn().mockResolvedValue({ id: 7, name: 'Riz' }),
    countProductOrderItems: jest.fn().mockResolvedValue(0),
    deleteProductCascade: jest.fn(),
    findOrderById: jest.fn().mockResolvedValue({ id: 3, status: 'PENDING' }),
    updateOrderStatus: jest.fn().mockResolvedValue({
      id: 3,
      status: 'CONFIRMED',
      client: { id: 5, firstName: 'Fatou', lastName: 'Sarr' },
      orderItems: [{ product: { shop: { userId: 4 } } }],
    }),
    ...overrides,
  } as unknown as AdminRepository;
}

const notifications: NotificationServicePort = {
  create: jest.fn().mockResolvedValue(undefined),
};

describe('Admin management use cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('liste les utilisateurs avec pagination', async () => {
    const repo = adminRepo();
    const result = await new ListAdminUsersUseCase(repo).execute({
      page: '1',
      limit: '20',
      role: 'CLIENT',
    });

    expect(result.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(repo.findUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      role: 'CLIENT',
      search: undefined,
    });
  });

  it('refuse un rôle utilisateur invalide', async () => {
    await expect(
      new UpdateAdminUserUseCase(adminRepo()).execute(2, { role: 'COMPANY' }),
    ).rejects.toMatchObject({
      statusCode: 400,
    } as Partial<ExpressContractException>);
  });

  it('empêche un admin de se supprimer lui-même', async () => {
    await expect(
      new DeleteAdminUserUseCase(adminRepo()).execute(9, 9),
    ).rejects.toMatchObject({
      statusCode: 400,
    } as Partial<ExpressContractException>);
  });

  it('refuse de supprimer un utilisateur lié à une boutique', async () => {
    const repo = adminRepo({
      countUserDependencies: jest.fn().mockResolvedValue({
        shop: 1,
        orders: 0,
        products: 2,
      }),
    });

    await expect(
      new DeleteAdminUserUseCase(repo).execute(2, 1),
    ).rejects.toMatchObject({
      statusCode: 409,
    } as Partial<ExpressContractException>);
    expect(repo.deleteUser).not.toHaveBeenCalled();
  });

  it('vérifie une boutique et notifie le commerçant', async () => {
    const repo = adminRepo();
    const result = await new UpdateAdminShopUseCase(repo, notifications).execute(
      10,
      { verifiedBadge: true },
    );

    expect(result.message).toBe('Boutique mise à jour');
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 4,
        type: 'SHOP',
        resourceId: 10,
      }),
    );
  });

  it('refuse de supprimer une boutique liée à des commandes', async () => {
    const repo = adminRepo({
      countShopOrderItems: jest.fn().mockResolvedValue(3),
    });

    await expect(new DeleteAdminShopUseCase(repo).execute(10)).rejects.toMatchObject(
      {
        statusCode: 409,
      } as Partial<ExpressContractException>,
    );
    expect(repo.deleteShopCascade).not.toHaveBeenCalled();
  });

  it('refuse de supprimer un produit lié à des commandes', async () => {
    const repo = adminRepo({
      countProductOrderItems: jest.fn().mockResolvedValue(2),
    });

    await expect(
      new DeleteAdminProductUseCase(repo).execute(7),
    ).rejects.toMatchObject({
      statusCode: 409,
    } as Partial<ExpressContractException>);
  });

  it('met à jour le statut d’une commande et notifie client et marchand', async () => {
    const repo = adminRepo();
    const result = await new UpdateAdminOrderStatusUseCase(
      repo,
      notifications,
    ).execute(3, 'CONFIRMED');

    expect(result.order.status).toBe('CONFIRMED');
    expect(notifications.create).toHaveBeenCalledTimes(2);
  });
});
