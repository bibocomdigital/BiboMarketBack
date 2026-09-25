import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  ADMIN_REPOSITORY,
  SOLD_ORDER_STATUSES,
  type AdminRepository,
} from '@domain/repositories/admin.repository';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function startOfMonthUtc(monthsAgo: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsAgo - 1), 1),
  );
}

function buildMonthRange(months: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    keys.push(
      monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))),
    );
  }
  return keys;
}

@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(monthsQuery?: string, lowStockQuery?: string) {
    try {
      const months = Math.min(
        24,
        Math.max(1, parseInt(monthsQuery ?? '12', 10) || 12),
      );
      const lowStockThreshold = Math.max(
        0,
        parseInt(lowStockQuery ?? '10', 10) || 10,
      );
      const startDate = startOfMonthUtc(months);
      const monthKeys = buildMonthRange(months);

      const [
        totalUsers,
        usersByRoleRows,
        usersByGenderRows,
        cities,
        registrations,
        totalShops,
        activeShops,
        verifiedShops,
        totalProducts,
        productsByStatus,
        lowStockCount,
        totalOrders,
        ordersByStatus,
        paymentMethods,
        soldOrders,
        soldRevenue,
        topSold,
        recentOrdersRaw,
      ] = await Promise.all([
        this.admin.countUsers(),
        this.admin.groupUsersByRole(),
        this.admin.groupUsersByGender(),
        this.admin.groupUsersByCity(10),
        this.admin.findUserCreatedAtSince(startDate),
        this.admin.countShops(),
        this.admin.countActiveShops(),
        this.admin.countVerifiedShops(),
        this.admin.countProducts(),
        this.admin.groupProductsByStatus(),
        this.admin.countLowStock(lowStockThreshold),
        this.admin.countOrders(),
        this.admin.groupOrdersByStatus(),
        this.admin.groupOrdersByPaymentMethod(),
        this.admin.findSoldOrdersSince(startDate),
        this.admin.aggregateSoldRevenue(),
        this.admin.findTopSoldProducts(5),
        this.admin.findRecentOrders(5),
      ]);

      const usersByRole: Record<string, number> = {
        SUPER_ADMIN: 0,
        ADMIN: 0,
        MODERATOR: 0,
        MERCHANT: 0,
        CLIENT: 0,
        SUPPLIER: 0,
      };
      for (const row of usersByRoleRows) {
        usersByRole[row.role as keyof typeof usersByRole] = row.count;
      }

      const genders = { MALE: 0, FEMALE: 0, OTHER: 0, UNKNOWN: 0 };
      for (const row of usersByGenderRows) {
        if (row.gender === 'MALE' || row.gender === 'FEMALE' || row.gender === 'OTHER') {
          genders[row.gender] = row.count;
        } else {
          genders.UNKNOWN += row.count;
        }
      }

      const publishedProducts =
        productsByStatus.find((row) => row.status === 'PUBLISHED')?.count ?? 0;
      const draftProducts =
        productsByStatus.find((row) => row.status === 'DRAFT')?.count ?? 0;

      const statusCounts = {
        pendingOrders: 0,
        confirmedOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        canceledOrders: 0,
      };
      for (const row of ordersByStatus) {
        if (row.status === 'PENDING') statusCounts.pendingOrders = row.count;
        if (row.status === 'CONFIRMED') statusCounts.confirmedOrders = row.count;
        if (row.status === 'SHIPPED') statusCounts.shippedOrders = row.count;
        if (row.status === 'DELIVERED') statusCounts.deliveredOrders = row.count;
        if (row.status === 'CANCELED') statusCounts.canceledOrders = row.count;
      }

      const paymentMethodCounts = {
        CASH_ON_DELIVERY: 0,
        MOBILE_MONEY: 0,
      };
      for (const row of paymentMethods) {
        if (row.paymentMethod === 'CASH_ON_DELIVERY') {
          paymentMethodCounts.CASH_ON_DELIVERY = row.count;
        }
        if (row.paymentMethod === 'MOBILE_MONEY') {
          paymentMethodCounts.MOBILE_MONEY = row.count;
        }
      }

      const registrationMap = new Map<string, number>(
        monthKeys.map((key) => [key, 0]),
      );
      for (const user of registrations) {
        const key = monthKey(new Date(user.createdAt));
        if (registrationMap.has(key)) {
          registrationMap.set(key, (registrationMap.get(key) ?? 0) + 1);
        }
      }

      const revenueMap = new Map<string, { revenue: number; orderCount: number }>(
        monthKeys.map((key) => [key, { revenue: 0, orderCount: 0 }]),
      );
      for (const order of soldOrders) {
        const key = monthKey(new Date(order.createdAt));
        const orderRevenue = order.orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        const bucket = revenueMap.get(key);
        if (bucket) {
          bucket.revenue += orderRevenue;
          bucket.orderCount += 1;
        }
      }

      const averageOrderValue =
        soldRevenue.orderCount > 0
          ? soldRevenue.revenue / soldRevenue.orderCount
          : 0;
      const deliveryRate =
        totalOrders > 0 ? (statusCounts.deliveredOrders / totalOrders) * 100 : 0;

      const previews = await this.admin.findProductPreviews(
        topSold.map((item) => item.productId),
      );
      const previewById = new Map(previews.map((product) => [product.id, product]));
      const topProducts = topSold.map((item) => {
        const product = previewById.get(item.productId);
        return {
          productId: item.productId,
          productName: product?.name ?? 'Produit supprimé',
          price: product?.price ?? 0,
          imageUrl: product?.imageUrl ?? null,
          totalSold: item.totalSold,
          totalRevenue: item.totalRevenue,
          orderCount: item.orderCount,
        };
      });

      return {
        currency: 'CFA',
        periodMonths: months,
        soldStatuses: [...SOLD_ORDER_STATUSES],
        kpis: {
          totalUsers,
          usersByRole,
          totalShops,
          activeShops,
          verifiedShops,
          totalProducts,
          publishedProducts,
          draftProducts,
          lowStockCount,
          lowStockThreshold,
          totalOrders,
          ...statusCounts,
          totalRevenue: soldRevenue.revenue,
          averageOrderValue,
          deliveryRate,
          paymentMethods: paymentMethodCounts,
        },
        charts: {
          registrations: monthKeys.map((month) => ({
            month,
            count: registrationMap.get(month) ?? 0,
          })),
          revenue: monthKeys.map((month) => ({
            month,
            revenue: revenueMap.get(month)?.revenue ?? 0,
            orderCount: revenueMap.get(month)?.orderCount ?? 0,
          })),
        },
        demographics: {
          cities: cities.map((row) => ({
            city: row.city ?? 'Non renseigné',
            country: row.country,
            count: row.count,
          })),
          genders,
        },
        topProducts,
        recentOrders: recentOrdersRaw.map((order) => ({
          id: order.id,
          clientName: `${order.client.firstName ?? ''} ${order.client.lastName ?? ''}`.trim(),
          totalAmount: order.totalAmount,
          status: order.status,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors du chargement du dashboard admin',
        error: errorMessage(error),
      });
    }
  }
}
