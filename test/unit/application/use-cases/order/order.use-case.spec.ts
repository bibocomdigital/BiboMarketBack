import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { OrderRepository } from '@domain/repositories/order.repository';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import {
  DeleteOrderUseCase,
  GetOrderByIdUseCase,
  ListOrdersUseCase,
  UpdateOrderStatusUseCase,
} from '@application/use-cases/order/order.use-case';
import { GetMerchantOrdersUseCase } from '@application/use-cases/order/order-merchant.use-case';
import { SendSelectedMerchantsReminderUseCase } from '@application/use-cases/order/order-reminder.use-case';

const order = {
  id: 12,
  clientId: 8,
  status: 'PENDING',
  client: { id: 8, firstName: 'Awa', lastName: 'Diop' },
  orderItems: [
    { product: { shop: { userId: 1, name: 'Chez Ali' } }, price: 10, quantity: 1 },
  ],
};

function ordersRepo(overrides: Partial<OrderRepository> = {}): OrderRepository {
  return {
    findClientOrders: jest.fn().mockResolvedValue([order]),
    findClientOrderById: jest.fn().mockResolvedValue(order),
    findByIdWithAuthContext: jest.fn().mockResolvedValue(order),
    updateStatus: jest.fn().mockResolvedValue({ ...order, status: 'CANCELED' }),
    findUserWithShop: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as OrderRepository;
}

const notifications: NotificationServicePort = {
  create: jest.fn().mockResolvedValue(undefined),
};

describe('ListOrdersUseCase', () => {
  it('renvoie { orders }', async () => {
    const result = await new ListOrdersUseCase(ordersRepo()).execute(8);
    expect(result.orders).toHaveLength(1);
  });
});

describe('GetOrderByIdUseCase', () => {
  it('renvoie 404 si la commande n’appartient pas au client', async () => {
    await expect(
      new GetOrderByIdUseCase(
        ordersRepo({ findClientOrderById: jest.fn().mockResolvedValue(null) }),
      ).execute(12, 8),
    ).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Commande non trouvée' },
    });
  });
});

describe('UpdateOrderStatusUseCase', () => {
  it('refuse un statut invalide', async () => {
    await expect(
      new UpdateOrderStatusUseCase(ordersRepo(), notifications).execute(
        12,
        8,
        'CLIENT',
        'NOPE',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('autorise le client à annuler une commande PENDING', async () => {
    const result = await new UpdateOrderStatusUseCase(
      ordersRepo(),
      notifications,
    ).execute(12, 8, 'CLIENT', 'CANCELED');

    expect(result.actor).toBe('CLIENT');
    expect(result.message).toBe(
      'Statut de la commande mis à jour avec succès',
    );
  });
});

describe('DeleteOrderUseCase', () => {
  it('refuse la suppression d’une commande non annulée', async () => {
    await expect(
      new DeleteOrderUseCase(ordersRepo(), notifications).execute(
        12,
        8,
        'CLIENT',
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('GetMerchantOrdersUseCase', () => {
  it('refuse un utilisateur sans boutique', async () => {
    await expect(
      new GetMerchantOrdersUseCase(ordersRepo()).execute(1),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('SendSelectedMerchantsReminderUseCase', () => {
  it('exige au moins un marchand', async () => {
    const personalized = {
      execute: jest.fn(),
    };
    await expect(
      new SendSelectedMerchantsReminderUseCase(personalized as never).execute(
        12,
        8,
        [],
      ),
    ).rejects.toBeInstanceOf(ExpressContractException);
  });
});
