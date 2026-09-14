import type { Cart } from '@domain/entities/cart.entity';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface CartOrderInput {
  clientId: number;
  totalAmount: number;
  items: { productId: number; quantity: number; price: number }[];
}

export interface CartRepository {
  findPublishedProduct(id: number): Promise<any>;
  findByUserId(userId: number): Promise<Cart | null>;
  create(userId: number): Promise<Cart>;
  findItemByCartAndProduct(cartId: number, productId: number): Promise<any>;
  updateItemQuantity(itemId: number, quantity: number): Promise<void>;
  createItem(cartId: number, productId: number, quantity: number): Promise<void>;
  findWithPreviewItems(userId: number): Promise<any>;
  findItemWithProduct(itemId: number, cartId: number): Promise<any>;
  deleteItem(itemId: number): Promise<void>;
  deleteAllItems(cartId: number): Promise<void>;
  findWithShopItemsAndUser(userId: number): Promise<any>;
  createMessage(data: {
    senderId: number;
    receiverId: number;
    content: string;
    includeReceiver?: boolean;
  }): Promise<any>;
  createOrder(data: CartOrderInput): Promise<any>;
}
