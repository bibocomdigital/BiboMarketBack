import { Inject, Injectable, Optional } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  ORDER_REPOSITORY,
  type OrderRepository,
} from '@domain/repositories/order.repository';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import {
  REALTIME_GATEWAY,
  type RealtimePort,
} from '@application/ports/output/realtime.port';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function imageUrlOf(image: unknown): string | undefined {
  if (!image) {
    return undefined;
  }
  if (typeof image === 'string') {
    return image;
  }
  if (typeof image === 'object' && image !== null && 'imageUrl' in image) {
    return String((image as { imageUrl: string }).imageUrl);
  }
  return undefined;
}

@Injectable()
export class SendOrderReminderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(orderId: number, userId: number, customMessage?: string) {
    try {
      const order = await this.orders.findClientOrderPending(orderId, userId);
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: 'Commande non trouvée ou déjà traitée',
        });
      }

      const shopItems: Record<
        string,
        { merchantId: number; shopName: string; items: any[] }
      > = {};
      for (const item of order.orderItems) {
        const merchantId = item.product.shop.userId;
        if (!shopItems[merchantId]) {
          shopItems[merchantId] = {
            merchantId,
            shopName: item.product.shop.name,
            items: [],
          };
        }
        shopItems[merchantId].items.push({
          name: item.product.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        });
      }

      const messageResults: Record<string, unknown>[] = [];
      for (const merchantId of Object.keys(shopItems)) {
        const shop = shopItems[merchantId];
        const shopTotal = shop.items.reduce((sum, item) => sum + item.total, 0);
        let messageContent = `⏰ **RAPPEL - Commande #${order.id}**\n\n`;
        messageContent += `Bonjour ! Je vous relance concernant ma commande #${order.id} qui est toujours en attente.\n\n`;
        messageContent += `**Articles commandés :**\n\n`;
        shop.items.forEach((item, index) => {
          messageContent += `${index + 1}. **${item.name}**\n`;
          messageContent += `   - Quantité: ${item.quantity}\n`;
          messageContent += `   - Total: ${item.total.toLocaleString()} FCFA\n\n`;
        });
        messageContent += `**TOTAL: ${shopTotal.toLocaleString()} FCFA**\n\n`;
        if (customMessage) {
          messageContent += `Message: ${customMessage}\n\n`;
        }
        messageContent += `Pouvez-vous me confirmer si vous avez bien reçu ma commande et sa disponibilité ?\n\n`;
        messageContent += `Merci !`;

        try {
          const sentMessage = await this.orders.createMessage({
            senderId: userId,
            receiverId: parseInt(merchantId, 10),
            content: messageContent,
          });
          try {
            await this.notifications.create({
              userId: parseInt(merchantId, 10),
              type: 'MESSAGE',
              message: `Rappel commande #${order.id} de ${order.client.firstName} ${order.client.lastName}`,
              resourceId: sentMessage.id,
              resourceType: 'Message',
              actionUrl: `/messages/${userId}`,
              priority: 2,
            });
          } catch {
            // Continuer
          }
          this.realtime?.emitToUserRoom(
            parseInt(merchantId, 10),
            'new_message',
            {
              message: sentMessage,
              sender: {
                id: userId,
                name: `${order.client.firstName} ${order.client.lastName}`,
              },
            },
          );
          messageResults.push({
            merchantId: parseInt(merchantId, 10),
            shopName: shop.shopName,
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
        message: 'Messages de rappel envoyés avec succès',
        results: messageResults,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: "Une erreur est survenue lors de l'envoi du rappel",
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class SendPersonalizedMerchantReminderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
    @Optional()
    @Inject(REALTIME_GATEWAY)
    private readonly realtime?: RealtimePort,
  ) {}

  async execute(
    orderId: number,
    merchantId: number,
    userId: number,
    input: { customMessage?: string; includeImages?: boolean | string },
  ) {
    try {
      const order = await this.orders.findClientOrderWithMerchants(
        orderId,
        userId,
        1,
      );
      if (!order) {
        throw ExpressContractException.raw(404, {
          message: 'Commande non trouvée',
        });
      }

      const merchantProducts = order.orderItems.filter(
        (item: any) => item.product.shop.userId === merchantId,
      );
      if (merchantProducts.length === 0) {
        throw ExpressContractException.raw(404, {
          message: 'Marchand non trouvé pour cette commande',
        });
      }

      const shop = merchantProducts[0].product.shop;
      const merchant = shop.owner;
      const merchantTotal = merchantProducts.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      );

      let messageContent = `🔔 Rappel commande #${order.id}\n\n`;
      if (input.customMessage) {
        messageContent += `${input.customMessage}\n\n`;
      }
      messageContent += `📦 Produits (${merchantProducts.length}) :\n`;
      merchantProducts.forEach((item: any, index: number) => {
        messageContent += `${index + 1}. ${item.product.name} (x${item.quantity})\n`;
      });
      messageContent += `\n💰 Total: ${merchantTotal.toLocaleString()} FCFA`;

      const sentMessage = await this.orders.createMessage({
        senderId: userId,
        receiverId: merchantId,
        content: messageContent,
      });

      try {
        await this.notifications.create({
          userId: merchantId,
          type: 'MESSAGE',
          message: `Rappel commande #${order.id} de ${order.client.firstName}`,
          resourceId: sentMessage.id,
          resourceType: 'Message',
          actionUrl: `/messages/${userId}`,
          priority: 2,
        });
      } catch {
        // Continuer
      }

      const includeImages = input.includeImages !== false && input.includeImages !== 'false';
      const imageResults: Record<string, unknown>[] = [];
      if (includeImages) {
        for (const item of merchantProducts) {
          const url = imageUrlOf(item.product.images?.[0]);
          if (url) {
            try {
              const imageMessage = await this.orders.createMessage({
                senderId: userId,
                receiverId: merchantId,
                content: `${item.product.name} (x${item.quantity})`,
                mediaUrl: url,
                mediaType: 'image',
              });
              imageResults.push({
                productId: item.product.id,
                productName: item.product.name,
                imageSent: true,
                messageId: imageMessage.id,
              });
            } catch (imageError) {
              imageResults.push({
                productId: item.product.id,
                productName: item.product.name,
                imageSent: false,
                error: errorMessage(imageError),
              });
            }
          } else {
            imageResults.push({
              productId: item.product.id,
              productName: item.product.name,
              imageSent: false,
              reason: 'Aucune image',
            });
          }
        }
      }

      this.realtime?.emitToUserRoom(merchantId, 'new_message', {
        message: sentMessage,
        sender: {
          id: userId,
          name: `${order.client.firstName} ${order.client.lastName}`,
        },
      });

      return {
        message: 'Rappel envoyé',
        data: {
          orderId: order.id,
          merchantId,
          merchantName: `${merchant.firstName} ${merchant.lastName}`,
          shopName: shop.name,
          productsCount: merchantProducts.length,
          totalAmount: merchantTotal,
          messageId: sentMessage.id,
          summary: {
            textMessage: true,
            imagesSent: imageResults.filter((row) => row.imageSent).length,
            imagesSkipped: imageResults.filter((row) => !row.imageSent).length,
          },
        },
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: "Erreur lors de l'envoi du rappel",
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class SendSelectedMerchantsReminderUseCase {
  constructor(
    private readonly personalized: SendPersonalizedMerchantReminderUseCase,
  ) {}

  async execute(
    orderId: number,
    userId: number,
    merchantIds: unknown,
    customMessage?: string,
    includeImages?: boolean | string,
  ) {
    try {
      if (!Array.isArray(merchantIds) || merchantIds.length === 0) {
        throw ExpressContractException.raw(400, {
          message: 'Veuillez sélectionner au moins un marchand',
        });
      }

      const results: Record<string, unknown>[] = [];
      for (const merchantId of merchantIds) {
        try {
          const result = await this.personalized.execute(
            orderId,
            parseInt(String(merchantId), 10),
            userId,
            { customMessage, includeImages },
          );
          results.push({
            merchantId,
            success: true,
            data: result,
          });
        } catch (sendError) {
          results.push({
            merchantId,
            success: false,
            error: errorMessage(sendError),
          });
        }
      }

      const successCount = results.filter((row) => row.success).length;
      const errorCount = results.filter((row) => !row.success).length;
      return {
        message: `Rappels envoyés: ${successCount} réussis, ${errorCount} échecs`,
        summary: {
          total: merchantIds.length,
          success: successCount,
          errors: errorCount,
        },
        results,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: "Une erreur est survenue lors de l'envoi des rappels",
        error: errorMessage(error),
      });
    }
  }
}
