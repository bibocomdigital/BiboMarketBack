import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '@domain/repositories/order.repository';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function notMerchant() {
  return ExpressContractException.raw(403, {
    message: "Accès refusé. Vous n'êtes pas un marchand.",
  });
}

function buildRevenueChart(orders: any[], days: number) {
  const chart: { date: string; revenue: number; orderCount: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= date && orderDate < nextDay;
    });
    const dayRevenue = dayOrders.reduce((sum, order) => {
      const orderRevenue = order.orderItems.reduce(
        (orderSum: number, item: { price: number; quantity: number }) =>
          orderSum + item.price * item.quantity,
        0,
      );
      return sum + orderRevenue;
    }, 0);
    chart.push({
      date: date.toISOString(),
      revenue: dayRevenue,
      orderCount: dayOrders.length,
    });
  }
  return chart;
}

@Injectable()
export class GetMerchantOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(merchantId: number) {
    try {
      const merchant = await this.orders.findUserWithShop(merchantId);
      if (!merchant || !merchant.shop) {
        throw notMerchant();
      }
      const orderItems = await this.orders.findMerchantOrderItems(
        merchant.shop.id,
      );
      const grouped: Record<string, any> = {};
      for (const item of orderItems) {
        const orderId = item.order.id;
        if (!grouped[orderId]) {
          grouped[orderId] = {
            id: orderId,
            status: item.order.status,
            client: item.order.client,
            createdAt: item.order.createdAt,
            totalAmount: 0,
            items: [],
          };
        }
        grouped[orderId].items.push({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        });
        grouped[orderId].totalAmount += item.price * item.quantity;
      }
      return { orders: Object.values(grouped) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération des commandes',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetTopProductsUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(merchantId: number) {
    try {
      const topProducts = await this.orders.groupTopProducts(merchantId);
      const enrichedProducts = await Promise.all(
        topProducts.map(async (item) => {
          const product = await this.orders.findProductPreview(item.productId, {
            id: true,
            name: true,
            price: true,
            images: { take: 1 },
          });
          return {
            product,
            totalSold: item._sum.quantity,
            totalRevenue: item._sum.price,
            orderCount: item._count.id,
          };
        }),
      );
      return { topProducts: enrichedProducts };
    } catch (error) {
      throw ExpressContractException.raw(500, { error: errorMessage(error) });
    }
  }
}

@Injectable()
export class GetMerchantStatsUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(merchantId: number) {
    try {
      const merchant = await this.orders.findUserWithShop(merchantId);
      if (!merchant || !merchant.shop) {
        throw notMerchant();
      }
      const shopId = merchant.shop.id;
      const [revenueData, statusCounts, topProductsRaw, recentOrdersRaw] =
        await Promise.all([
          this.orders.aggregateMerchantRevenue(shopId),
          this.orders.groupOrdersByStatus(shopId),
          this.orders.groupTopProducts(merchantId),
          this.orders.findRecentMerchantOrders(shopId, 5),
        ]);

      let totalOrders = 0;
      let pendingOrders = 0;
      let confirmedOrders = 0;
      let shippedOrders = 0;
      let deliveredOrders = 0;
      let canceledOrders = 0;
      for (const row of statusCounts) {
        const count = row._count.id;
        totalOrders += count;
        if (row.status === 'PENDING') pendingOrders = count;
        if (row.status === 'CONFIRMED') confirmedOrders = count;
        if (row.status === 'SHIPPED') shippedOrders = count;
        if (row.status === 'DELIVERED') deliveredOrders = count;
        if (row.status === 'CANCELED') canceledOrders = count;
      }

      const topProducts = await Promise.all(
        topProductsRaw.map(async (item) => {
          const product = await this.orders.findProductPreview(item.productId, {
            id: true,
            name: true,
            price: true,
          });
          return {
            productId: product.id,
            productName: product.name,
            totalSold: item._sum.quantity || 0,
            totalRevenue: item._sum.price || 0,
            orderCount: item._count.id || 0,
          };
        }),
      );

      const recentOrders = recentOrdersRaw.map((order) => ({
        id: order.id,
        clientName: `${order.client.firstName} ${order.client.lastName}`,
        totalAmount: order.orderItems.reduce(
          (sum: number, item: { price: number; quantity: number }) =>
            sum + item.price * item.quantity,
          0,
        ),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      }));

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const ordersWithItems = await this.orders.findMerchantOrdersInRange(
        shopId,
        sevenDaysAgo,
      );
      const revenueChart = buildRevenueChart(ordersWithItems, 7);
      const totalRevenue = revenueData._sum.price || 0;
      const successRate =
        totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalRevenue,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        canceledOrders,
        successRate,
        averageOrderValue,
        topProducts,
        recentOrders,
        revenueChart,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message:
          'Une erreur est survenue lors de la récupération des statistiques',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetRevenueChartUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(merchantId: number, daysQuery?: string) {
    try {
      const days = parseInt(daysQuery ?? '', 10) || 7;
      const merchant = await this.orders.findUserWithShop(merchantId);
      if (!merchant || !merchant.shop) {
        throw notMerchant();
      }
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const ordersWithItems = await this.orders.findMerchantOrdersInRange(
        merchant.shop.id,
        startDate,
      );
      return { chartData: buildRevenueChart(ordersWithItems, days) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors de la récupération du graphique',
        error: errorMessage(error),
      });
    }
  }
}
