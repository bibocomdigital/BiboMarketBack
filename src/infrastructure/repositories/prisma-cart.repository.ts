import { Injectable } from '@nestjs/common';
import type { Cart } from '@domain/entities/cart.entity';
import type {
  CartOrderInput,
  CartRepository,
} from '@domain/repositories/cart.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const previewProduct = {
  select: {
    id: true,
    name: true,
    price: true,
    stock: true,
    images: { take: 1 },
  },
} as const;

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublishedProduct(id: number) {
    return this.prisma.product.findFirst({
      where: { id, status: 'PUBLISHED' },
    });
  }

  findByUserId(userId: number): Promise<Cart | null> {
    return this.prisma.cart.findUnique({
      where: { userId },
    }) as Promise<Cart | null>;
  }

  create(userId: number): Promise<Cart> {
    return this.prisma.cart.create({
      data: { userId },
    }) as Promise<Cart>;
  }

  findItemByCartAndProduct(cartId: number, productId: number) {
    return this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  }

  async updateItemQuantity(itemId: number, quantity: number): Promise<void> {
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity, updatedAt: new Date() },
    });
  }

  async createItem(
    cartId: number,
    productId: number,
    quantity: number,
  ): Promise<void> {
    await this.prisma.cartItem.create({
      data: { cartId, productId, quantity },
    });
  }

  findWithPreviewItems(userId: number) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: previewProduct },
        },
      },
    });
  }

  findItemWithProduct(itemId: number, cartId: number) {
    return this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { product: true },
    });
  }

  async deleteItem(itemId: number): Promise<void> {
    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async deleteAllItems(cartId: number): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  findWithShopItemsAndUser(userId: number) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                images: {
                  select: { imageUrl: true },
                  take: 1,
                },
                shop: {
                  select: {
                    id: true,
                    name: true,
                    userId: true,
                    logo: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });
  }

  createMessage(data: {
    senderId: number;
    receiverId: number;
    content: string;
    includeReceiver?: boolean;
  }) {
    return this.prisma.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        isRead: false,
      },
      ...(data.includeReceiver
        ? {
            include: {
              receiver: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }
        : {}),
    });
  }

  createOrder(data: CartOrderInput) {
    return this.prisma.order.create({
      data: {
        clientId: data.clientId,
        totalAmount: data.totalAmount,
        status: 'PENDING',
        paymentMethod: 'CASH_ON_DELIVERY',
        orderItems: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { orderItems: true },
    });
  }
}
