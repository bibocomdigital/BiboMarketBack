import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { CartRepository } from '@domain/repositories/cart.repository';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import {
  AddToCartUseCase,
  CreateOrderFromCartUseCase,
  GetCartUseCase,
  UpdateCartItemUseCase,
} from '@application/use-cases/cart/cart.use-case';

const product = {
  id: 20,
  name: 'Riz',
  price: 15000,
  stock: 5,
  status: 'PUBLISHED',
};

const cart = { id: 1, userId: 8, createdAt: new Date(), updatedAt: new Date() };

function cartsRepo(overrides: Partial<CartRepository> = {}): CartRepository {
  return {
    findPublishedProduct: jest.fn().mockResolvedValue(product),
    findByUserId: jest.fn().mockResolvedValue(cart),
    create: jest.fn().mockResolvedValue(cart),
    findItemByCartAndProduct: jest.fn().mockResolvedValue(null),
    updateItemQuantity: jest.fn(),
    createItem: jest.fn(),
    findWithPreviewItems: jest.fn().mockResolvedValue({
      ...cart,
      items: [{ product, quantity: 1 }],
    }),
    findItemWithProduct: jest.fn().mockResolvedValue({
      id: 3,
      cartId: 1,
      product,
      quantity: 1,
    }),
    deleteItem: jest.fn(),
    deleteAllItems: jest.fn(),
    findWithShopItemsAndUser: jest.fn(),
    createMessage: jest.fn(),
    createOrder: jest.fn(),
    ...overrides,
  } as unknown as CartRepository;
}

describe('AddToCartUseCase', () => {
  it('refuse un produit non publié', async () => {
    const useCase = new AddToCartUseCase(
      cartsRepo({ findPublishedProduct: jest.fn().mockResolvedValue(null) }),
    );

    await expect(useCase.execute(8, 20, 1)).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Produit non trouvé ou non publié' },
    });
  });

  it('refuse un stock insuffisant', async () => {
    const useCase = new AddToCartUseCase(cartsRepo());

    await expect(useCase.execute(8, 20, 99)).rejects.toMatchObject({
      statusCode: 400,
      body: { message: 'Quantité demandée non disponible en stock' },
    });
  });

  it('ajoute un article au panier', async () => {
    const carts = cartsRepo();
    const result = await new AddToCartUseCase(carts).execute(8, 20, 1);

    expect(result.message).toBe('Produit ajouté au panier');
    expect(carts.createItem).toHaveBeenCalledWith(1, 20, 1);
  });
});

describe('GetCartUseCase', () => {
  it('renvoie un panier vide si aucun panier n’existe', async () => {
    const result = await new GetCartUseCase(
      cartsRepo({ findWithPreviewItems: jest.fn().mockResolvedValue(null) }),
    ).execute(8);

    expect(result).toEqual({
      message: 'Panier vide',
      cart: { items: [] },
    });
  });
});

describe('UpdateCartItemUseCase', () => {
  it('retire l’article si la quantité est 0', async () => {
    const carts = cartsRepo();
    const result = await new UpdateCartItemUseCase(carts).execute(8, 3, 0);

    expect(result).toEqual({ message: 'Article retiré du panier' });
    expect(carts.deleteItem).toHaveBeenCalledWith(3);
  });
});

describe('CreateOrderFromCartUseCase', () => {
  it('refuse un panier vide', async () => {
    const notifications: NotificationServicePort = { create: jest.fn() };
    const useCase = new CreateOrderFromCartUseCase(
      cartsRepo({
        findWithShopItemsAndUser: jest.fn().mockResolvedValue({ items: [] }),
      }),
      notifications,
    );

    await expect(useCase.execute(8)).rejects.toBeInstanceOf(
      ExpressContractException,
    );
  });
});
