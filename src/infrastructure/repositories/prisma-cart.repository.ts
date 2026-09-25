import { Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
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
    promoPrice: true,
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
                promoPrice: true,
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
    return this.prisma.$transaction(async (tx) => {
      const snapshots: Array<{
        productId: number;
        userId: number;
        quantity: number;
        stockAfter: number;
      }> = [];
      for (const item of data.items) {
        const reserved = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) {
          throw ExpressContractException.raw(400, {
            message: 'Stock insuffisant pour finaliser la commande',
            productId: item.productId,
          });
        }
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, userId: true },
        });
        if (product) {
          snapshots.push({
            productId: item.productId,
            userId: product.userId,
            quantity: item.quantity,
            stockAfter: product.stock,
          });
        }
      }

      const order = await tx.order.create({
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
      for (const snap of snapshots) {
        await tx.stockMovement.create({
          data: {
            productId: snap.productId,
            userId: snap.userId,
            kind: 'COMMANDE',
            quantity: snap.quantity,
            delta: -snap.quantity,
            stockAfter: snap.stockAfter,
            orderId: order.id,
          },
        });
      }
      return order;
    });
  }
}
