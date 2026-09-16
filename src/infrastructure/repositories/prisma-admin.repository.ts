import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type {
  AdminListFilter,
  AdminOrderListFilter,
  AdminProductListFilter,
  AdminRepository,
  AdminShopListFilter,
  AdminUserListFilter,
} from '@domain/repositories/admin.repository';
import { SOLD_ORDER_STATUSES } from '@domain/repositories/admin.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const soldStatuses = [...SOLD_ORDER_STATUSES];

const adminUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  whatsappNumber: true,
  gender: true,
  country: true,
  city: true,
  department: true,
  commune: true,
  photo: true,
  role: true,
  isVerified: true,
  isProfileCompleted: true,
  onboardingStep: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  shop: {
    select: {
      id: true,
      name: true,
      verifiedBadge: true,
      status: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  async groupUsersByRole() {
    const rows = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    return rows.map((row) => ({ role: row.role, count: row._count.id }));
  }

  async groupUsersByGender() {
    const rows = await this.prisma.user.groupBy({
      by: ['gender'],
      _count: { id: true },
    });
    return rows.map((row) => ({ gender: row.gender, count: row._count.id }));
  }

  async groupUsersByCity(take: number) {
    const rows = await this.prisma.user.groupBy({
      by: ['city', 'country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take,
    });
    return rows.map((row) => ({
      city: row.city,
      country: row.country,
      count: row._count.id,
    }));
  }

  findUserCreatedAtSince(startDate: Date) {
    return this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });
  }

  countShops(): Promise<number> {
    return this.prisma.shop.count();
  }

  countActiveShops(): Promise<number> {
    return this.prisma.shop.count({ where: { status: true } });
  }

  countVerifiedShops(): Promise<number> {
    return this.prisma.shop.count({ where: { verifiedBadge: true } });
  }

  countProducts(): Promise<number> {
    return this.prisma.product.count();
  }

  async groupProductsByStatus() {
    const rows = await this.prisma.product.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return rows.map((row) => ({ status: row.status, count: row._count.id }));
  }

  countLowStock(threshold: number): Promise<number> {
    return this.prisma.product.count({
      where: { stock: { lt: threshold } },
    });
  }

  countOrders(): Promise<number> {
    return this.prisma.order.count();
  }

  async groupOrdersByStatus() {
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    return rows.map((row) => ({ status: row.status, count: row._count.id }));
  }

  async groupOrdersByPaymentMethod() {
    const rows = await this.prisma.order.groupBy({
      by: ['paymentMethod'],
      _count: { id: true },
    });
    return rows.map((row) => ({
      paymentMethod: row.paymentMethod,
      count: row._count.id,
    }));
  }

  async aggregateSoldRevenue() {
    const items = await this.prisma.orderItem.findMany({
      where: { order: { status: { in: [...soldStatuses] } } },
      select: { price: true, quantity: true, orderId: true },
    });
    const orderIds = new Set(items.map((item) => item.orderId));
    return {
      revenue: items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      orderCount: orderIds.size,
    };
  }

  findSoldOrdersSince(startDate: Date) {
    return this.prisma.order.findMany({
      where: {
        status: { in: [...soldStatuses] },
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        createdAt: true,
        orderItems: {
          select: { price: true, quantity: true, productId: true },
        },
      },
    });
  }

  async findTopSoldProducts(take: number) {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: { in: [...soldStatuses] } } },
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take,
    });

    const revenues = await Promise.all(
      grouped.map(async (row) => {
        const items = await this.prisma.orderItem.findMany({
          where: {
            productId: row.productId,
            order: { status: { in: [...soldStatuses] } },
          },
          select: { price: true, quantity: true },
        });
        const totalRevenue = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        return {
          productId: row.productId,
          totalSold: row._sum.quantity || 0,
          totalRevenue,
          orderCount: row._count.id,
        };
      }),
    );

    return revenues;
  }

  async findProductPreviews(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        images: { take: 1, select: { imageUrl: true } },
      },
    });
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0]?.imageUrl ?? null,
    }));
  }

  findRecentOrders(take: number) {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        client: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findUsers(filter: AdminUserListFilter) {
    const where: Prisma.UserWhereInput = {};
    if (filter.role) {
      where.role = filter.role as Prisma.UserWhereInput['role'];
    }
    if (filter.search) {
      where.OR = [
        { email: { contains: filter.search, mode: 'insensitive' } },
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  findUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });
  }

  updateUser(id: number, data: Record<string, unknown>) {
    return this.prisma.user.update({
      where: { id },
      data: data as Prisma.UserUncheckedUpdateInput,
      select: adminUserSelect,
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async countUserDependencies(id: number) {
    const [shop, orders, products] = await Promise.all([
      this.prisma.shop.count({ where: { userId: id } }),
      this.prisma.order.count({ where: { clientId: id } }),
      this.prisma.product.count({ where: { userId: id } }),
    ]);
    return { shop, orders, products };
  }

  async findShops(filter: AdminShopListFilter) {
    const where: Prisma.ShopWhereInput = {};
    if (typeof filter.status === 'boolean') {
      where.status = filter.status;
    }
    if (typeof filter.verified === 'boolean') {
      where.verifiedBadge = filter.verified;
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filter.search, mode: 'insensitive' } },
        { address: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              photo: true,
            },
          },
          categorieShop: { select: { id: true, name: true } },
          _count: { select: { products: true, feedbacks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.shop.count({ where }),
    ]);
    return { shops, total };
  }

  findShopById(id: number) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            photo: true,
            city: true,
          },
        },
        categorieShop: { select: { id: true, name: true, description: true } },
        _count: {
          select: { products: true, feedbacks: true, contactMessages: true },
        },
      },
    });
  }

  updateShop(id: number, data: Record<string, unknown>) {
    return this.prisma.shop.update({
      where: { id },
      data: data as Prisma.ShopUncheckedUpdateInput,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        categorieShop: { select: { id: true, name: true } },
      },
    });
  }

  countShopOrderItems(shopId: number): Promise<number> {
    return this.prisma.orderItem.count({
      where: { product: { shopId } },
    });
  }

  async deleteShopCascade(shopId: number): Promise<void> {
    const products = await this.prisma.product.findMany({
      where: { shopId },
      select: { id: true },
    });
    const productIds = products.map((product) => product.id);

    await this.prisma.$transaction(async (tx) => {
      const contacts = await tx.merchantContact.findMany({
        where: { shopId },
        select: { id: true },
      });
      const contactIds = contacts.map((contact) => contact.id);
      if (contactIds.length > 0) {
        await tx.merchantContactResponse.deleteMany({
          where: { merchantContactId: { in: contactIds } },
        });
        await tx.merchantContact.deleteMany({ where: { shopId } });
      }

      await tx.merchantFeedback.deleteMany({ where: { shopId } });

      if (productIds.length > 0) {
        await tx.productLike.deleteMany({
          where: { productId: { in: productIds } },
        });
        await tx.productShare.deleteMany({
          where: { productId: { in: productIds } },
        });
        const comments = await tx.productComment.findMany({
          where: { productId: { in: productIds } },
          select: { id: true },
        });
        const commentIds = comments.map((comment) => comment.id);
        if (commentIds.length > 0) {
          await tx.commentReply.deleteMany({
            where: { commentId: { in: commentIds } },
          });
          await tx.productComment.deleteMany({
            where: { id: { in: commentIds } },
          });
        }
        await tx.cartItem.deleteMany({
          where: { productId: { in: productIds } },
        });
        await tx.productImage.deleteMany({
          where: { productId: { in: productIds } },
        });
        await tx.product.deleteMany({ where: { shopId } });
      }

      await tx.shop.delete({ where: { id: shopId } });
    });
  }

  async findProducts(filter: AdminProductListFilter) {
    const where: Prisma.ProductWhereInput = {};
    if (filter.status) {
      where.status = filter.status as Prisma.ProductWhereInput['status'];
    }
    if (filter.shopId) {
      where.shopId = filter.shopId;
    }
    if (filter.lowStock) {
      where.stock = { lt: filter.lowStockThreshold ?? 10 };
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          images: { take: 1 },
          shop: {
            select: { id: true, name: true, verifiedBadge: true, status: true },
          },
          categorieProd: {
            select: {
              id: true,
              name: true,
              shopCategory: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total };
  }

  findProductById(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        shop: {
          select: {
            id: true,
            name: true,
            userId: true,
            verifiedBadge: true,
            status: true,
          },
        },
        categorieProd: {
          select: {
            id: true,
            name: true,
            shopCategory: { select: { id: true, name: true } },
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  updateProduct(id: number, data: Record<string, unknown>) {
    return this.prisma.product.update({
      where: { id },
      data: data as Prisma.ProductUncheckedUpdateInput,
      include: {
        images: { take: 1 },
        shop: { select: { id: true, name: true } },
      },
    });
  }

  countProductOrderItems(productId: number): Promise<number> {
    return this.prisma.orderItem.count({ where: { productId } });
  }

  async deleteProductCascade(productId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.productLike.deleteMany({ where: { productId } });
      await tx.productShare.deleteMany({ where: { productId } });
      const comments = await tx.productComment.findMany({
        where: { productId },
        select: { id: true },
      });
      const commentIds = comments.map((comment) => comment.id);
      if (commentIds.length > 0) {
        await tx.commentReply.deleteMany({
          where: { commentId: { in: commentIds } },
        });
        await tx.productComment.deleteMany({
          where: { id: { in: commentIds } },
        });
      }
      await tx.cartItem.deleteMany({ where: { productId } });
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
    });
  }

  async findOrders(filter: AdminOrderListFilter) {
    const where: Prisma.OrderWhereInput = {};
    if (filter.status) {
      where.status = filter.status as Prisma.OrderWhereInput['status'];
    }
    if (filter.paymentMethod) {
      where.paymentMethod =
        filter.paymentMethod as Prisma.OrderWhereInput['paymentMethod'];
    }
    if (filter.search) {
      const id = Number(filter.search);
      where.OR = [
        Number.isFinite(id) ? { id } : undefined,
        {
          client: {
            OR: [
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
              { phoneNumber: { contains: filter.search, mode: 'insensitive' } },
            ],
          },
        },
      ].filter(Boolean) as Prisma.OrderWhereInput[];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  shop: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { orders, total };
  }

  findOrderById(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            city: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: { take: 1 },
                shop: {
                  select: { id: true, name: true, userId: true, phoneNumber: true },
                },
              },
            },
          },
        },
        feedbacks: true,
      },
    });
  }

  updateOrderStatus(id: number, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: status as never },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        orderItems: {
          include: {
            product: {
              select: {
                shop: { select: { userId: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async findFeedbacks(filter: AdminListFilter) {
    const where: Prisma.MerchantFeedbackWhereInput = {};
    if (filter.search) {
      where.OR = [
        { comment: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      this.prisma.merchantFeedback.findMany({
        where,
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
          merchant: {
            select: { id: true, firstName: true, lastName: true },
          },
          shop: { select: { id: true, name: true } },
          order: { select: { id: true, status: true, totalAmount: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.merchantFeedback.count({ where }),
    ]);
    return { feedbacks, total };
  }
}
