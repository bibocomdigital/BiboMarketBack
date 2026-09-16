import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import { VALID_ORDER_STATUSES } from '@domain/entities/order.entity';
import {
  ADMIN_REPOSITORY,
  type AdminRepository,
} from '@domain/repositories/admin.repository';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import { parseAdminPage, pagination } from './admin-users.use-case';

const PAYMENT_METHODS = ['CASH_ON_DELIVERY', 'MOBILE_MONEY'] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class ListAdminOrdersUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(query: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    paymentMethod?: string;
  }) {
    try {
      const { page, limit } = parseAdminPage(query.page, query.limit);
      if (query.status && !VALID_ORDER_STATUSES.includes(query.status as never)) {
        throw ExpressContractException.raw(400, {
          message: 'Statut de commande invalide',
          allowed: VALID_ORDER_STATUSES,
        });
      }
      if (
        query.paymentMethod &&
        !PAYMENT_METHODS.includes(query.paymentMethod as never)
      ) {
        throw ExpressContractException.raw(400, {
          message: 'Mode de paiement invalide',
          allowed: PAYMENT_METHODS,
        });
      }
      const { orders, total } = await this.admin.findOrders({
        page,
        limit,
        search: query.search?.trim() || undefined,
        status: query.status,
        paymentMethod: query.paymentMethod,
      });
      return { orders, pagination: pagination(total, page, limit) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors de la récupération des commandes',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetAdminOrderUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(id: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const order = await this.admin.findOrderById(id);
    if (!order) {
      throw ExpressContractException.raw(404, {
        message: 'Commande non trouvée',
      });
    }
    return { order };
  }
}

@Injectable()
export class UpdateAdminOrderStatusUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(id: number, status: string) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    if (!VALID_ORDER_STATUSES.includes(status as never)) {
      throw ExpressContractException.raw(400, {
        message: 'Statut de commande invalide',
        allowed: VALID_ORDER_STATUSES,
      });
    }
    const existing = await this.admin.findOrderById(id);
    if (!existing) {
      throw ExpressContractException.raw(404, {
        message: 'Commande non trouvée',
      });
    }

    const order = await this.admin.updateOrderStatus(id, status);
    const merchantIds = [
      ...new Set(
        order.orderItems.map((item: { product: { shop: { userId: number } } }) =>
          item.product.shop.userId,
        ),
      ),
    ] as number[];

    await this.notifications.create({
      userId: order.client.id,
      type: 'ORDER',
      message: `Le statut de votre commande #${id} a été mis à jour : ${status}.`,
      actionUrl: `/commandes/${id}`,
      resourceId: id,
      resourceType: 'Order',
      priority: 1,
    });
    for (const merchantId of merchantIds) {
      await this.notifications.create({
        userId: merchantId,
        type: 'ORDER',
        message: `Commande #${id} : statut mis à jour par l'admin (${status}).`,
        actionUrl: `/commandes-recues`,
        resourceId: id,
        resourceType: 'Order',
        priority: 1,
      });
    }

    return { message: 'Statut de la commande mis à jour', order };
  }
}
