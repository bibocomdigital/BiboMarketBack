import { Injectable } from '@nestjs/common';
import type { OrderRepository } from '@domain/repositories/order.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const soldStatuses = ['CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findClientOrders(clientId: number) {
    return this.prisma.order.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
                images: { take: 1 },
                shop: {
                  select: { id: true, name: true, phoneNumber: true },
                },
              },
            },
          },
        },
      },
    });
  }

  findClientOrderById(orderId: number, clientId: number) {
    return this.prisma.order.findFirst({
      where: { id: orderId, clientId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: { take: 1 },
                shop: {
                  select: { id: true, name: true, phoneNumber: true },
                },
              },
            },
          },
        },
      },
    });
  }

  findClientOrderPending(orderId: number, clientId: number) {
    return this.prisma.order.findFirst({
      where: { id: orderId, clientId, status: 'PENDING' },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
                shop: {
                  select: { id: true, name: true, userId: true },
                },
              },
            },
          },
        },
        client: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
      },
    });
  }

  findClientOrderConfirmed(orderId: number, clientId: number) {
    return this.prisma.order.findFirst({
      where: { id: orderId, clientId, status: 'CONFIRMED' },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                shop: {
                  select: { id: true, name: true, userId: true },
                },
              },
            },
          },
        },
      },
    });
  }

  findClientOrderWithShops(orderId: number, clientId: number) {
    return this.prisma.order.findFirst({
      where: { id: orderId, clientId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
                shop: {
                  select: {
                    id: true,
                    name: true,
                    userId: true,
                    owner: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        photo: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        client: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
      },
    });
  }

  findClientOrderWithMerchants(
    orderId: number,
    clientId: number,
    imageTake: number,
  ) {
    return this.prisma.order.findFirst({
      where: { id: orderId, clientId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: { take: imageTake },
                shop: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    userId: true,
                    owner: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        photo: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        client: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
      },
    });
  }

  findByIdWithAuthContext(orderId: number) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                shopId: true,
                shop: { select: { userId: true, name: true } },
              },
            },
          },
        },
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  updateStatus(orderId: number, status: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as never },
      include: {
        orderItems: {
          include: {
            product: {
              include: { shop: { select: { name: true } } },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  findUserWithShop(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true },
    });
  }

  findMerchantOrderItems(shopId: number) {
    return this.prisma.orderItem.findMany({
      where: { product: { shopId } },
      include: {
        order: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: { take: 1 },
          },
        },
      },
      orderBy: { order: { createdAt: 'desc' } },
    });
  }

  async deleteNotificationsByOrderId(orderId: number): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { resourceType: 'Order', resourceId: orderId },
    });
  }

  async deleteOrderItems(orderId: number): Promise<void> {
    await this.prisma.orderItem.deleteMany({ where: { orderId } });
  }

  async deleteOrder(orderId: number): Promise<void> {
    await this.prisma.order.delete({ where: { id: orderId } });
  }

  async findOldCanceledOrderIds(before: Date): Promise<number[]> {
    const rows = await this.prisma.order.findMany({
      where: { status: 'CANCELED', updatedAt: { lte: before } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async deleteNotificationsByOrderIds(ids: number[]): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { resourceType: 'Order', resourceId: { in: ids } },
    });
  }

  async deleteOrderItemsByOrderIds(ids: number[]): Promise<void> {
    await this.prisma.orderItem.deleteMany({
      where: { orderId: { in: ids } },
    });
  }

  async deleteOrders(ids: number[]): Promise<number> {
    const result = await this.prisma.order.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  groupTopProducts(merchantId: number) {
    return this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: { shop: { userId: merchantId } },
        order: { status: { in: [...soldStatuses] } },
      },
      _sum: { quantity: true, price: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
  }

  findProductPreview(id: number, select: Record<string, unknown>) {
    return this.prisma.product.findUnique({
      where: { id },
      select: select as never,
    });
  }

  aggregateMerchantRevenue(shopId: number) {
    return this.prisma.orderItem.aggregate({
      where: {
        product: { shopId },
        order: { status: { in: [...soldStatuses] } },
      },
      _sum: { price: true },
      _count: { id: true },
    });
  }

  groupOrdersByStatus(shopId: number) {
    return this.prisma.order.groupBy({
      by: ['status'],
      where: {
        orderItems: { some: { product: { shopId } } },
      },
      _count: { id: true },
    });
  }

  findRecentMerchantOrders(shopId: number, take: number) {
    return this.prisma.order.findMany({
      where: {
        orderItems: { some: { product: { shopId } } },
      },
      include: {
        client: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        orderItems: {
          where: { product: { shopId } },
          select: { price: true, quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  findMerchantOrdersInRange(shopId: number, startDate: Date) {
    return this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: [...soldStatuses] },
        orderItems: { some: { product: { shopId } } },
      },
      include: {
        orderItems: {
          where: { product: { shopId } },
          select: { price: true, quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findShippedOlderThan(date: Date) {
    return this.prisma.order.findMany({
      where: { status: 'SHIPPED', updatedAt: { lte: date } },
      select: { id: true, clientId: true },
    });
  }

  createMessage(data: {
    senderId: number;
    receiverId: number;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  }) {
    return this.prisma.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        isRead: false,
      },
    });
  }
}
