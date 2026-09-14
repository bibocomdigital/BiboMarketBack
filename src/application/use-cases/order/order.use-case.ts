import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import { VALID_ORDER_STATUSES } from '@domain/entities/order.entity';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '@domain/repositories/order.repository';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';

export const orderMessages = {
  errors: {
    orderNotFound: 'Commande non trouvée',
    invalidStatus: 'Statut de commande invalide',
    notAuthorized:
      "Vous n'êtes pas autorisé à effectuer cette action sur cette commande",
    onlyCanceledCanBeDeleted:
      'Seules les commandes annulées peuvent être supprimées définitivement',
    notAuthorizedDelete: "Vous n'êtes pas autorisé à supprimer cette commande",
    getOrdersError:
      'Une erreur est survenue lors de la récupération des commandes',
    getOrderError:
      'Une erreur est survenue lors de la récupération de la commande',
    updateStatusError:
      'Une erreur est survenue lors de la mise à jour du statut de la commande',
    deleteOrderError:
      'Une erreur est survenue lors de la suppression de la commande',
    checkConfirmationError:
      'Une erreur est survenue lors de la vérification de la commande',
    deleteOldOrdersError: 'Erreur lors du nettoyage des anciennes commandes',
    requestFeedbackError:
      'Une erreur est survenue lors de la demande de feedback',
    getMerchantsError:
      'Erreur lors de la récupération des marchands de la commande',
    getMerchantsDetailsError: 'Erreur lors de la récupération des détails',
  },
  success: {
    statusUpdated: 'Statut de la commande mis à jour avec succès',
    orderDeleted: 'Commande supprimée définitivement avec succès',
  },
  statusMessages: {
    CONFIRMED: {
      client: (firstName: string, orderId: string | number) =>
        `🎉 Félicitations ${firstName} ! Le commerçant vient de confirmer votre commande #COMANDE-${orderId}. Préparez-vous à recevoir vos articles bientôt !`,
      merchant: (firstName: string, lastName: string, orderId: string | number) =>
        `✅ Parfait ! Vous avez confirmé la commande #COMANDE-${orderId} de ${firstName} ${lastName}.`,
    },
    SHIPPED: {
      client: (firstName: string, orderId: string | number) =>
        `🚚 Excellente nouvelle ${firstName} ! Votre commande #COMANDE-${orderId} est maintenant en route vers vous !`,
      merchant: (orderId: string | number) =>
        `📦 Commande #COMANDE-${orderId} marquée comme expédiée avec succès !`,
    },
    CANCELED: {
      client: (orderId: string | number) =>
        `❌ Votre commande #COMANDE-${orderId} a été annulée par le commerçant.`,
      merchant: (orderId: string | number) =>
        `❌ Vous avez annulé la commande #COMANDE-${orderId}.`,
    },
  },
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function raw500(message: string, error: unknown) {
  return ExpressContractException.raw(500, {
    message,
    error: errorMessage(error),
  });
}

function statusLabel(status: string): string {
  if (status === 'CONFIRMED') return 'confirmée';
  if (status === 'SHIPPED') return 'en cours de livraison';
  if (status === 'DELIVERED') return 'livrée';
  if (status === 'CANCELED') return 'annulée';
  return 'dans un autre état';
}

function uniqueMerchantsFromItems(orderItems: any[], withShopId = false) {
  const merchants: any[] = [];
  const merchantIds = new Set<number>();
  for (const item of orderItems) {
    const merchantId = item.product.shop.userId;
    const owner = item.product.shop.owner;
    if (!merchantIds.has(merchantId)) {
      merchantIds.add(merchantId);
      merchants.push({
        merchantId,
        ...(withShopId ? { shopId: item.product.shop.id } : {}),
        shopName: item.product.shop.name,
        merchantFirstName: owner?.firstName,
        merchantLastName: owner?.lastName,
        merchantPhoto: owner?.photo,
        isOnline: false,
      });
    }
  }
  return merchants;
}

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(userId: number) {
    try {
      const list = await this.orders.findClientOrders(userId);
      return { orders: list };
    } catch (error) {
      throw raw500(orderMessages.errors.getOrdersError, error);
    }
  }
}

@Injectable()
export class GetOrderByIdUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(orderId: number, userId: number) {
    try {
      const order = await this.orders.findClientOrderById(orderId, userId);
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: orderMessages.errors.orderNotFound,
        });
      }
      return { order };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.getOrderError, error);
    }
  }
}

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(
    orderId: number,
    userId: number,
    userRole: string | undefined,
    status: string,
  ) {
    try {
      if (!VALID_ORDER_STATUSES.includes(status as never)) {
        throw ExpressContractException.raw(400, {
          message: orderMessages.errors.invalidStatus,
        });
      }

      const order = await this.orders.findByIdWithAuthContext(orderId);
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: orderMessages.errors.orderNotFound,
        });
      }

      let isAuthorized = false;
      let actorType = '';

      if (userRole === 'CLIENT') {
        if (
          order.clientId === userId &&
          status === 'CANCELED' &&
          order.status === 'PENDING'
        ) {
          isAuthorized = true;
          actorType = 'CLIENT';
        } else if (
          order.clientId === userId &&
          status === 'DELIVERED' &&
          order.status === 'SHIPPED'
        ) {
          isAuthorized = true;
          actorType = 'CLIENT';
        }
      } else if (userRole === 'MERCHANT') {
        const isMerchantOrder = order.orderItems.some(
          (item: any) => item.product.shop.userId === userId,
        );
        if (isMerchantOrder) {
          isAuthorized = true;
          actorType = 'MERCHANT';
        }
      }

      if (!isAuthorized) {
        throw ExpressContractException.raw(403, {
          message: orderMessages.errors.notAuthorized,
          details: {
            userRole,
            requestedStatus: status,
            currentStatus: order.status,
            clientId: order.clientId,
            userId,
          },
        });
      }

      const updatedOrder = await this.orders.updateStatus(orderId, status);
      const merchantIds = [
        ...new Set(
          order.orderItems.map((item: any) => item.product.shop.userId),
        ),
      ] as number[];

      if (actorType === 'CLIENT' && status === 'CANCELED') {
        await this.notifications.create({
          userId: order.client.id,
          type: 'ORDER',
          message: `❌ Vous avez annulé votre commande #COMANDE-${orderId}. Nous espérons vous revoir bientôt !`,
          actionUrl: `/commandes/${orderId}`,
          resourceId: orderId,
          resourceType: 'Order',
          priority: 1,
        });
        for (const merchantId of merchantIds) {
          await this.notifications.create({
            userId: merchantId,
            type: 'ORDER',
            message: `❌ Le client ${order.client.firstName} ${order.client.lastName} a annulé la commande #COMANDE-${orderId}.`,
            actionUrl: `/commandes-recues`,
            resourceId: orderId,
            resourceType: 'Order',
            priority: 1,
          });
        }
      } else if (actorType === 'CLIENT' && status === 'DELIVERED') {
        await this.notifications.create({
          userId: order.client.id,
          type: 'ORDER',
          message: `✅ Merci ${order.client.firstName} ! Vous avez confirmé la réception de votre commande #COMANDE-${orderId}. N'hésitez pas à laisser un avis !`,
          actionUrl: `/commandes/${orderId}`,
          resourceId: orderId,
          resourceType: 'Order',
          priority: 1,
        });
        for (const merchantId of merchantIds) {
          await this.notifications.create({
            userId: merchantId,
            type: 'ORDER',
            message: `🎉 Excellent ! ${order.client.firstName} ${order.client.lastName} a confirmé avoir reçu la commande #COMANDE-${orderId}.`,
            actionUrl: `/commandes-recues`,
            resourceId: orderId,
            resourceType: 'Order',
            priority: 1,
          });
        }
      } else {
        const templates =
          orderMessages.statusMessages[
            status as keyof typeof orderMessages.statusMessages
          ];
        if (templates) {
          await this.notifications.create({
            userId: order.client.id,
            type: 'ORDER',
            message: templates.client(order.client.firstName, orderId),
            actionUrl: `/commandes/${orderId}`,
            resourceId: orderId,
            resourceType: 'Order',
            priority: 1,
          });
          await this.notifications.create({
            userId,
            type: 'ORDER',
            message: (
              templates.merchant as (
                ...args: Array<string | number>
              ) => string
            )(order.client.firstName, order.client.lastName, orderId),
            actionUrl: `/commandes-recues`,
            resourceId: orderId,
            resourceType: 'Order',
            priority: 1,
          });
        }
      }

      return {
        message: orderMessages.success.statusUpdated,
        order: updatedOrder,
        notifications: 'Notifications envoyées',
        actor: actorType,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.updateStatusError, error);
    }
  }
}

@Injectable()
export class DeleteOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(orderId: number, userId: number, userRole: string | undefined) {
    try {
      const order = await this.orders.findByIdWithAuthContext(orderId);
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: orderMessages.errors.orderNotFound,
        });
      }
      if (order.status !== 'CANCELED') {
        throw ExpressContractException.raw(400, {
          message: orderMessages.errors.onlyCanceledCanBeDeleted,
          currentStatus: order.status,
        });
      }

      let isAuthorized = false;
      if (userRole === 'CLIENT' && order.clientId === userId) {
        isAuthorized = true;
      } else if (userRole === 'MERCHANT') {
        isAuthorized = order.orderItems.some(
          (item: any) => item.product.shop.userId === userId,
        );
      } else if (userRole === 'ADMIN') {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        throw ExpressContractException.raw(403, {
          message: orderMessages.errors.notAuthorizedDelete,
        });
      }

      await this.orders.deleteNotificationsByOrderId(orderId);
      await this.orders.deleteOrderItems(orderId);
      await this.orders.deleteOrder(orderId);

      if (userRole === 'CLIENT') {
        await this.notifications.create({
          userId,
          type: 'SYSTEM',
          message: `🗑️ Votre commande annulée #COMANDE-${orderId} a été supprimée définitivement.`,
          priority: 1,
        });
      }

      return {
        message: orderMessages.success.orderDeleted,
        orderId,
        deletedBy: userRole,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.deleteOrderError, error);
    }
  }
}

@Injectable()
export class CheckOrderConfirmationUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(orderId: number, userId: number) {
    try {
      const order = await this.orders.findClientOrderWithShops(orderId, userId);
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: orderMessages.errors.orderNotFound,
        });
      }
      if (order.status === 'PENDING') {
        return {
          message: 'Votre commande est toujours en attente de confirmation',
          orderId: order.id,
          status: order.status,
          suggestion:
            'Vous pouvez envoyer un message de rappel aux marchands via la messagerie',
          merchants: uniqueMerchantsFromItems(order.orderItems),
        };
      }
      return {
        message: `Votre commande est ${statusLabel(order.status)}`,
        orderId: order.id,
        status: order.status,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.checkConfirmationError, error);
    }
  }
}

@Injectable()
export class CheckOrderConfirmationImprovedUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(orderId: number, userId: number) {
    try {
      const order = await this.orders.findClientOrderWithShops(orderId, userId);
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: orderMessages.errors.orderNotFound,
        });
      }
      if (order.status === 'PENDING') {
        return {
          message: 'Votre commande est toujours en attente de confirmation',
          orderId: order.id,
          status: order.status,
          suggestion:
            'Vous pouvez envoyer un message de rappel aux marchands via la messagerie',
          merchants: uniqueMerchantsFromItems(order.orderItems, true),
        };
      }
      return {
        message: `Votre commande est ${statusLabel(order.status)}`,
        orderId: order.id,
        status: order.status,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.checkConfirmationError, error);
    }
  }
}

@Injectable()
export class RequestMerchantFeedbackUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(orderId: number, userId: number) {
    try {
      const order = await this.orders.findClientOrderConfirmed(orderId, userId);
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: 'Commande confirmée non trouvée',
        });
      }
      const merchants: any[] = [];
      const merchantIds = new Set<number>();
      for (const item of order.orderItems) {
        const merchantId = item.product.shop.userId;
        if (!merchantIds.has(merchantId)) {
          merchantIds.add(merchantId);
          merchants.push({
            merchantId,
            shopId: item.product.shop.id,
            shopName: item.product.shop.name,
          });
        }
      }
      return {
        message: 'Veuillez évaluer vos interactions avec ces commerçants',
        orderId: order.id,
        merchants,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.requestFeedbackError, error);
    }
  }
}

@Injectable()
export class GetOrderMerchantsUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(orderId: number, userId: number) {
    try {
      const order = await this.orders.findClientOrderWithMerchants(
        orderId,
        userId,
        1,
      );
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: orderMessages.errors.orderNotFound,
        });
      }
      const merchantsMap = new Map<number, any>();
      for (const item of order.orderItems) {
        const shop = item.product.shop;
        const merchantUserId = shop.userId;
        if (!merchantsMap.has(merchantUserId)) {
          merchantsMap.set(merchantUserId, {
            merchantId: merchantUserId,
            shopId: shop.id,
            shopName: shop.name,
            shopPhone: shop.phoneNumber,
            merchantFirstName: shop.owner.firstName,
            merchantLastName: shop.owner.lastName,
            merchantPhoto: shop.owner.photo,
            isOnline: false,
            products: [],
          });
        }
        merchantsMap.get(merchantUserId).products.push({
          id: item.product.id,
          name: item.product.name,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          images: item.product.images,
        });
      }
      return { orderId: order.id, merchants: Array.from(merchantsMap.values()) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.getMerchantsError, error);
    }
  }
}

@Injectable()
export class GetOrderMerchantsWithProductsUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(orderId: number, userId: number) {
    try {
      const order = await this.orders.findClientOrderWithMerchants(
        orderId,
        userId,
        3,
      );
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: orderMessages.errors.orderNotFound,
        });
      }
      const merchantsMap = new Map<number, any>();
      for (const item of order.orderItems) {
        const shop = item.product.shop;
        const merchantUserId = shop.userId;
        if (!merchantsMap.has(merchantUserId)) {
          merchantsMap.set(merchantUserId, {
            merchantId: merchantUserId,
            shopId: shop.id,
            shopName: shop.name,
            shopPhone: shop.phoneNumber,
            merchantFirstName: shop.owner.firstName,
            merchantLastName: shop.owner.lastName,
            merchantPhoto: shop.owner.photo,
            products: [],
            totalAmount: 0,
            totalItems: 0,
          });
        }
        const merchant = merchantsMap.get(merchantUserId);
        merchant.products.push({
          id: item.product.id,
          name: item.product.name,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          images: item.product.images,
          hasImages: item.product.images.length > 0,
        });
        merchant.totalAmount += item.price * item.quantity;
        merchant.totalItems += item.quantity;
      }
      const merchants = Array.from(merchantsMap.values());
      return {
        orderId: order.id,
        orderStatus: order.status,
        merchantsCount: merchants.length,
        merchants,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(orderMessages.errors.getMerchantsDetailsError, error);
    }
  }
}

@Injectable()
export class CleanupCanceledOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const orderIds = await this.orders.findOldCanceledOrderIds(thirtyDaysAgo);
      if (orderIds.length === 0) {
        return {
          message: 'Aucune ancienne commande annulée à nettoyer',
          cleaned: 0,
        };
      }
      await this.orders.deleteNotificationsByOrderIds(orderIds);
      await this.orders.deleteOrderItemsByOrderIds(orderIds);
      const cleaned = await this.orders.deleteOrders(orderIds);
      return {
        message: `Nettoyage terminé: ${cleaned} commandes annulées supprimées`,
        cleaned,
        orderIds,
      };
    } catch (error) {
      throw raw500(orderMessages.errors.deleteOldOrdersError, error);
    }
  }
}

@Injectable()
export class AutoConfirmDeliveriesUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
    const toConfirm = await this.orders.findShippedOlderThan(twoDaysAgo);
    for (const order of toConfirm) {
      await this.orders.updateStatus(order.id, 'DELIVERED');
      await this.notifications.create({
        userId: order.clientId,
        type: 'ORDER',
        message: `✅ Votre commande #${order.id} a été automatiquement confirmée comme livrée après 48h. Si problème, contactez le support.`,
        actionUrl: `/commandes/${order.id}`,
      });
    }
    return {
      message: 'Auto-confirmation executed',
      confirmed: toConfirm.length,
    };
  }
}
