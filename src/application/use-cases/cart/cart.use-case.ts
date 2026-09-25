import { Inject, Injectable, Optional } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@domain/repositories/cart.repository';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import {
  REALTIME_GATEWAY,
  type RealtimePort,
} from '@application/ports/output/realtime.port';
import { chargedPrice } from '@domain/pricing/charged-price';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function raw500(message: string, error: unknown) {
  return ExpressContractException.raw(500, {
    message,
    error: errorMessage(error),
  });
}

function totalPrice(
  items: { product: { price: number; promoPrice?: number | null }; quantity: number }[],
) {
  return items.reduce(
    (total, item) => total + chargedPrice(item.product.price, item.product.promoPrice) * item.quantity,
    0,
  );
}

function formatFcfa(amount: number) {
  return `${Math.round(Number(amount) || 0).toLocaleString('fr-FR')} FCFA`;
}

function groupItemsByShop(items: any[]) {
  const shopItems: Record<
    string,
    {
      merchantId: number;
      shopId: number;
      shopName: string;
      logo: string | null;
      items: {
        name: string;
        price: number;
        quantity: number;
        total: number;
        imageUrl?: string;
      }[];
    }
  > = {};

  for (const item of items) {
    const merchantId = item.product.shop.userId;
    if (!shopItems[merchantId]) {
      shopItems[merchantId] = {
        merchantId,
        shopId: item.product.shop.id,
        shopName: item.product.shop.name,
        logo: item.product.shop.logo,
        items: [],
      };
    }
    const unit = chargedPrice(item.product.price, item.product.promoPrice);
    shopItems[merchantId].items.push({
      name: item.product.name,
      price: unit,
      quantity: item.quantity,
      total: unit * item.quantity,
      imageUrl: item.product.images?.[0]?.imageUrl,
    });
  }

  return shopItems;
}

@Injectable()
export class AddToCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute(userId: number, productId: unknown, quantity: unknown = 1) {
    try {
      const parsedProductId = parseInt(String(productId), 10);
      const parsedQuantity = parseInt(String(quantity ?? 1), 10);

      const product = await this.carts.findPublishedProduct(parsedProductId);
      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé ou non publié',
        });
      }

      if (product.stock < parsedQuantity) {
        throw ExpressContractException.raw(400, {
          message: 'Quantité demandée non disponible en stock',
        });
      }

      let cart = await this.carts.findByUserId(userId);
      if (!cart) {
        cart = await this.carts.create(userId);
      }

      const existingItem = await this.carts.findItemByCartAndProduct(
        cart.id,
        parsedProductId,
      );

      if (existingItem) {
        await this.carts.updateItemQuantity(
          existingItem.id,
          existingItem.quantity + parsedQuantity,
        );
      } else {
        await this.carts.createItem(cart.id, parsedProductId, parsedQuantity);
      }

      const updatedCart = await this.carts.findWithPreviewItems(userId);
      return {
        message: 'Produit ajouté au panier',
        cart: updatedCart,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500("Une erreur est survenue lors de l'ajout au panier", error);
    }
  }
}

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute(userId: number) {
    try {
      const cart = await this.carts.findWithPreviewItems(userId);
      if (!cart) {
        return {
          message: 'Panier vide',
          cart: { items: [] },
        };
      }

      return {
        cart: {
          ...cart,
          totalPrice: totalPrice(cart.items),
        },
      };
    } catch (error) {
      throw raw500(
        'Une erreur est survenue lors de la récupération du panier',
        error,
      );
    }
  }
}

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute(userId: number, itemId: number, quantity: number) {
    try {
      const cart = await this.carts.findByUserId(userId);
      if (!cart) {
        throw ExpressContractException.raw(404, { message: 'Panier non trouvé' });
      }

      const cartItem = await this.carts.findItemWithProduct(itemId, cart.id);
      if (!cartItem) {
        throw ExpressContractException.raw(404, {
          message: 'Article non trouvé dans le panier',
        });
      }

      if (quantity > cartItem.product.stock) {
        throw ExpressContractException.raw(400, {
          message: 'Quantité demandée non disponible en stock',
        });
      }

      if (quantity <= 0) {
        await this.carts.deleteItem(itemId);
        return { message: 'Article retiré du panier' };
      }

      await this.carts.updateItemQuantity(itemId, parseInt(String(quantity), 10));
      const updatedCart = await this.carts.findWithPreviewItems(userId);

      return {
        message: 'Panier mis à jour',
        cart: {
          ...updatedCart,
          totalPrice: totalPrice(updatedCart.items),
        },
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        'Une erreur est survenue lors de la mise à jour du panier',
        error,
      );
    }
  }
}

@Injectable()
export class RemoveFromCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute(userId: number, itemId: number) {
    try {
      const cart = await this.carts.findByUserId(userId);
      if (!cart) {
        throw ExpressContractException.raw(404, { message: 'Panier non trouvé' });
      }

      const cartItem = await this.carts.findItemWithProduct(itemId, cart.id);
      if (!cartItem) {
        throw ExpressContractException.raw(404, {
          message: 'Article non trouvé dans le panier',
        });
      }

      await this.carts.deleteItem(itemId);
      return { message: 'Article retiré du panier' };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        "Une erreur est survenue lors de la suppression de l'article",
        error,
      );
    }
  }
}

@Injectable()
export class ClearCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
  ) {}

  async execute(userId: number) {
    try {
      const cart = await this.carts.findByUserId(userId);
      if (!cart) {
        throw ExpressContractException.raw(404, { message: 'Panier non trouvé' });
      }

      await this.carts.deleteAllItems(cart.id);
      return { message: 'Panier vidé avec succès' };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500('Une erreur est survenue lors du vidage du panier', error);
    }
  }
}

@Injectable()
export class ShareCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(userId: number, message?: string) {
    try {
      const cart = await this.carts.findWithShopItemsAndUser(userId);
      if (!cart || cart.items.length === 0) {
        throw ExpressContractException.raw(400, { message: 'Panier vide' });
      }

      const shopItems = groupItemsByShop(cart.items);
      const messageResults: Record<string, unknown>[] = [];

      for (const merchantId of Object.keys(shopItems)) {
        const shop = shopItems[merchantId];
        const shopTotal = shop.items.reduce((sum, item) => sum + item.total, 0);

        let messageContent = `🛒 **Demande de panier**\n`;
        messageContent += `${cart.user.firstName} ${cart.user.lastName}\n\n`;
        messageContent += `Bonjour, je souhaite commander ces articles de « ${shop.shopName} » :\n\n`;

        shop.items.forEach((item, index) => {
          messageContent += `${index + 1}. **${item.name}**\n`;
          messageContent += `   • Quantité : ${item.quantity}\n`;
          messageContent += `   • Prix unitaire : ${formatFcfa(item.price)}\n`;
          messageContent += `   • Total : ${formatFcfa(item.total)}\n\n`;
        });

        messageContent += `**Total : ${formatFcfa(shopTotal)}**\n\n`;
        if (message) {
          messageContent += `Message : ${message}\n\n`;
        }
        messageContent += `Mes coordonnées\n`;
        messageContent += `📱 ${cart.user.phoneNumber || 'Non renseigné'}\n`;
        if (cart.user.email) {
          messageContent += `📧 ${cart.user.email}\n`;
        }
        messageContent += `\nMerci de confirmer la disponibilité et les modalités.`;

        try {
          const sentMessage = await this.carts.createMessage({
            senderId: userId,
            receiverId: parseInt(merchantId, 10),
            content: messageContent,
            includeReceiver: true,
          });

          try {
            await this.notifications.create({
              userId: parseInt(merchantId, 10),
              type: 'MESSAGE',
              message: `Nouvelle demande de panier de ${cart.user.firstName} ${cart.user.lastName}`,
              resourceId: sentMessage.id,
              resourceType: 'Message',
              actionUrl: `/messages/${userId}`,
              priority: 2,
            });
          } catch {
            // Express appelle createNotification sans l'importer : on conserve le message envoyé.
          }

          this.realtime?.emitToUserRoom(
            parseInt(merchantId, 10),
            'new_message',
            {
              message: sentMessage,
              sender: {
                id: userId,
                name: `${cart.user.firstName} ${cart.user.lastName}`,
                photo: cart.user.photo ?? null,
              },
            },
          );

          messageResults.push({
            merchantId: parseInt(merchantId, 10),
            shopName: shop.shopName,
            messageId: sentMessage.id,
            success: true,
          });
        } catch (sendError) {
          messageResults.push({
            merchantId: parseInt(merchantId, 10),
            shopName: shop.shopName,
            success: false,
            error: errorMessage(sendError),
          });
        }
      }

      return {
        message: 'Messages envoyés aux marchands avec succès',
        results: messageResults,
        totalMerchants: Object.keys(shopItems).length,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        "Une erreur est survenue lors de l'envoi des messages",
        error,
      );
    }
  }
}

@Injectable()
export class CreateOrderFromCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(userId: number, message?: string) {
    try {
      const cart = await this.carts.findWithShopItemsAndUser(userId);
      if (!cart || cart.items.length === 0) {
        throw ExpressContractException.raw(400, { message: 'Panier vide' });
      }

      for (const item of cart.items) {
        if (item.quantity > item.product.stock) {
          throw ExpressContractException.raw(400, {
            message: `Stock insuffisant pour ${item.product.name}`,
            productId: item.product.id,
          });
        }
      }

      const order = await this.carts.createOrder({
        clientId: userId,
        totalAmount: totalPrice(cart.items),
        items: cart.items.map((item: any) => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: chargedPrice(item.product.price, item.product.promoPrice),
        })),
      });

      const shopItems = groupItemsByShop(cart.items);
      const messageResults: Record<string, unknown>[] = [];

      for (const merchantId of Object.keys(shopItems)) {
        const shop = shopItems[merchantId];
        const shopTotal = shop.items.reduce((sum, item) => sum + item.total, 0);

        let messageContent = `🎉 **Nouvelle commande n° ${order.id}**\n\n`;
        messageContent += `Bonjour, j'ai passé la commande n° ${order.id} sur Bibocom Market.\n\n`;
        messageContent += `**Articles — ${shop.shopName}**\n\n`;

        shop.items.forEach((item, index) => {
          messageContent += `${index + 1}. **${item.name}**\n`;
          messageContent += `   • Quantité : ${item.quantity}\n`;
          messageContent += `   • Prix : ${formatFcfa(item.price)}\n`;
          messageContent += `   • Total : ${formatFcfa(item.total)}\n\n`;
        });

        messageContent += `**Total : ${formatFcfa(shopTotal)}**\n\n`;
        if (message) {
          messageContent += `Message : ${message}\n\n`;
        }
        messageContent += `**Mes coordonnées**\n`;
        messageContent += `📱 ${cart.user.phoneNumber || 'Non renseigné'}\n`;
        if (cart.user.email) {
          messageContent += `📧 ${cart.user.email}\n`;
        }
        messageContent += `\nRéférence : n° ${order.id}\n`;
        messageContent += `Date : ${new Date().toLocaleDateString('fr-FR')}\n\n`;
        messageContent += `Merci de confirmer la commande et les modalités de livraison.`;

        try {
          const sentMessage = await this.carts.createMessage({
            senderId: userId,
            receiverId: parseInt(merchantId, 10),
            content: messageContent,
          });

          try {
            await this.notifications.create({
              userId: parseInt(merchantId, 10),
              type: 'ORDER',
              message: `Nouvelle commande #${order.id} de ${cart.user.firstName} ${cart.user.lastName}`,
              resourceId: order.id,
              resourceType: 'Order',
              actionUrl: `/messages/${userId}`,
              priority: 1,
            });
          } catch {
            // Continuer malgré l'erreur de notification
          }

          this.realtime?.emitToUserRoom(
            parseInt(merchantId, 10),
            'new_message',
            {
              message: sentMessage,
              sender: {
                id: userId,
                name: `${cart.user.firstName} ${cart.user.lastName}`,
                photo: cart.user.photo ?? null,
              },
            },
          );

          messageResults.push({
            merchantId: parseInt(merchantId, 10),
            shopName: shop.shopName,
            messageId: sentMessage.id,
            success: true,
          });
        } catch (sendError) {
          messageResults.push({
            merchantId: parseInt(merchantId, 10),
            shopName: shop.shopName,
            success: false,
            error: errorMessage(sendError),
          });
        }
      }

      await this.carts.deleteAllItems(cart.id);

      return {
        message: 'Commande créée et messages envoyés aux marchands',
        order: {
          id: order.id,
          totalAmount: order.totalAmount,
          status: 'PENDING',
          createdAt: order.createdAt,
        },
        messageResults,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw raw500(
        'Une erreur est survenue lors de la création de la commande',
        error,
      );
    }
  }
}
