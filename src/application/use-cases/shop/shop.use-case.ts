import { unlinkSync } from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '@domain/repositories/shop.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  FILE_STORAGE,
  type FileStoragePort,
} from '@application/ports/output/file-storage.port';
import {
  EMAIL_SERVICE,
  type EmailServicePort,
} from '@application/ports/output/email-service.port';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import { NODE_ENV } from '@application/config/env';

const shopErrors = {
  creation: {
    notMerchant: 'Seuls les commerçants peuvent créer une boutique',
    alreadyHasShop: 'Vous possédez déjà une boutique',
    phoneNumberExists:
      'Ce numéro de téléphone est déjà utilisé par une autre boutique',
    uploadFailed: 'Échec du téléchargement du logo de la boutique',
  },
  retrieval: {
    notFound: 'Boutique non trouvée',
    invalidId: 'ID de boutique invalide',
    noShopOwned: "Vous n'avez pas encore de boutique",
    noProductsFound: 'Aucun produit disponible pour cette boutique',
  },
  update: {
    notAuthorized: "Vous n'êtes pas autorisé à modifier cette boutique",
    phoneNumberExists:
      'Ce numéro de téléphone est déjà utilisé par une autre boutique',
    uploadFailed: 'Échec du téléchargement du nouveau logo',
  },
  deletion: {
    notAuthorized: "Vous n'êtes pas autorisé à supprimer cette boutique",
  },
  contact: {
    notAuthenticated: 'Vous devez être connecté pour contacter un commerçant',
    selfContact: 'Vous ne pouvez pas envoyer un message à votre propre boutique',
    missingFields: 'Le sujet et le message sont obligatoires',
    invalidMessageId: 'ID de message invalide',
    responseNotAuthorized: "Vous n'êtes pas autorisé à répondre à ce message",
    missingResponse: 'La réponse est obligatoire',
  },
};

export type ShopQuery = Record<string, string | string[] | undefined>;

export type ShopContactActor = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unexpectedError(error: unknown): ExpressContractException {
  if (error instanceof ExpressContractException) {
    return error;
  }

  return ExpressContractException.raw(500, {
    status: 'error',
    message: 'Something went wrong!',
    error: NODE_ENV === 'development' ? errorMessage(error) : 'Internal Server Error',
  });
}

function isPhoneUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const prismaError = error as { code?: string; meta?: { target?: string[] } };
  return (
    prismaError.code === 'P2002' &&
    Array.isArray(prismaError.meta?.target) &&
    prismaError.meta.target.includes('phoneNumber')
  );
}

function queryValue(query: ShopQuery, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function unlinkTempFile(filePath?: string): void {
  if (!filePath) {
    return;
  }
  unlinkSync(filePath);
}

function productImageUrl(image: { imageUrl?: string; url?: string }): string | undefined {
  return image.imageUrl ?? image.url;
}

@Injectable()
export class CreateShopUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(input: {
    userId: number;
    name?: string;
    description?: string;
    phoneNumber?: string;
    address?: string;
    categorieShopId?: number | string;
    filePath?: string;
  }) {
    try {
      const user = await this.users.findById(input.userId);
      if (!user) {
        throw new ExpressContractException(
          404,
          'Utilisateur non trouvé',
          'USER_NOT_FOUND',
        );
      }

      if (user.role !== 'MERCHANT') {
        throw new ExpressContractException(
          403,
          shopErrors.creation.notMerchant,
          'NOT_MERCHANT',
        );
      }

      const existingShop = await this.shops.findByUserId(input.userId);
      if (existingShop) {
        throw new ExpressContractException(
          400,
          shopErrors.creation.alreadyHasShop,
          'SHOP_EXISTS',
        );
      }

      let logoUrl: string | null = null;
      if (input.filePath) {
        try {
          logoUrl = await this.fileStorage.uploadImage(
            input.filePath,
            'shop_logos',
          );
          unlinkTempFile(input.filePath);
        } catch (cloudinaryError) {
          throw new ExpressContractException(
            500,
            shopErrors.creation.uploadFailed,
            undefined,
            {
              name: 'CloudinaryError',
              details: errorMessage(cloudinaryError),
            },
          );
        }
      }

      const categorieShopId = input.categorieShopId
        ? Number(input.categorieShopId)
        : undefined;

      const newShop = await this.shops.create({
        name: input.name,
        description: input.description,
        phoneNumber: input.phoneNumber,
        address: input.address,
        userId: input.userId,
        logo: logoUrl,
        ...(Number.isFinite(categorieShopId) ? { categorieShopId } : {}),
      });

      await this.notifications.create({
        userId: input.userId,
        type: 'SHOP',
        message: `Félicitations! Votre boutique "${input.name}" a été créée avec succès.`,
        resourceId: newShop.id,
        resourceType: 'Shop',
        actionUrl: `/dashboard/shops/${newShop.id}`,
        priority: 1,
      });

      return {
        status: 'success',
        message: 'Boutique créée avec succès',
        shop: newShop,
      };
    } catch (error) {
      if (isPhoneUniqueViolation(error)) {
        throw new ExpressContractException(
          400,
          shopErrors.creation.phoneNumberExists,
          'PHONE_EXISTS',
        );
      }
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class GetMyShopUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {}

  async execute(userId: number) {
    try {
      const shop = await this.shops.findByUserId(userId);
      if (!shop) {
        throw new ExpressContractException(
          404,
          shopErrors.retrieval.noShopOwned,
          'NO_SHOP_OWNED',
        );
      }

      const products = await this.shops.findProductsByShopId(shop.id);
      return {
        status: 'success',
        message: 'Boutique récupérée avec succès',
        shop,
        products,
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class GetShopByIdUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {}

  async execute(id: number) {
    try {
      if (Number.isNaN(id)) {
        throw new ExpressContractException(
          400,
          shopErrors.retrieval.invalidId,
          'INVALID_ID',
        );
      }

      const shop = await this.shops.findById(id);
      if (!shop) {
        throw new ExpressContractException(
          404,
          shopErrors.retrieval.notFound,
          'SHOP_NOT_FOUND',
        );
      }

      const products = await this.shops.findProductsByShopId(id);
      return {
        status: 'success',
        message: 'Boutique récupérée avec succès',
        shop,
        products,
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class GetShopProductsUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {}

  async execute(shopId: number, query: ShopQuery = {}) {
    try {
      if (Number.isNaN(shopId)) {
        throw new ExpressContractException(
          400,
          shopErrors.retrieval.invalidId,
          'INVALID_ID',
        );
      }

      const shop = await this.shops.findById(shopId);
      if (!shop) {
        throw new ExpressContractException(
          404,
          shopErrors.retrieval.notFound,
          'SHOP_NOT_FOUND',
        );
      }

      const page = parseInt(queryValue(query, 'page') ?? '', 10) || 1;
      const limit = parseInt(queryValue(query, 'limit') ?? '', 10) || 10;
      const categoryId = queryValue(query, 'category')
        ? parseInt(queryValue(query, 'category') as string, 10)
        : undefined;
      const searchTerm = queryValue(query, 'search');
      const minPrice = queryValue(query, 'minPrice')
        ? parseFloat(queryValue(query, 'minPrice') as string)
        : undefined;
      const maxPrice = queryValue(query, 'maxPrice')
        ? parseFloat(queryValue(query, 'maxPrice') as string)
        : undefined;
      const sortBy = queryValue(query, 'sortBy');
      const order = queryValue(query, 'order') === 'asc' ? 'asc' : 'desc';
      const status = queryValue(query, 'status');

      const { products, total } = await this.shops.findFilteredProducts({
        shopId,
        page,
        limit,
        categoryId:
          categoryId && !Number.isNaN(categoryId) ? categoryId : undefined,
        searchTerm,
        minPrice,
        maxPrice,
        sortBy,
        order,
        status,
      });

      return {
        status: 'success',
        message:
          products.length > 0
            ? 'Produits récupérés avec succès'
            : shopErrors.retrieval.noProductsFound,
        products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class UpdateShopUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(
    id: number,
    userId: number,
    input: {
      name?: string;
      description?: string;
      phoneNumber?: string;
      address?: string;
      filePath?: string;
    },
  ) {
    try {
      if (Number.isNaN(id)) {
        throw new ExpressContractException(
          400,
          shopErrors.retrieval.invalidId,
          'INVALID_ID',
        );
      }

      const shop = await this.shops.findById(id);
      if (!shop) {
        throw new ExpressContractException(
          404,
          shopErrors.retrieval.notFound,
          'SHOP_NOT_FOUND',
        );
      }

      if (shop.userId !== userId) {
        throw new ExpressContractException(
          403,
          shopErrors.update.notAuthorized,
          'NOT_AUTHORIZED',
        );
      }

      let logoUrl = shop.logo;
      if (input.filePath) {
        try {
          if (shop.logo && shop.logo.includes('cloudinary.com')) {
            try {
              await this.fileStorage.deleteImage(shop.logo, 'shop_logos');
            } catch {
              // Continuer malgré l'erreur, comme Express
            }
          }

          logoUrl = await this.fileStorage.uploadImage(
            input.filePath,
            'shop_logos',
          );
          unlinkTempFile(input.filePath);
        } catch (cloudinaryError) {
          if (cloudinaryError instanceof ExpressContractException) {
            throw cloudinaryError;
          }
          throw new ExpressContractException(
            500,
            shopErrors.update.uploadFailed,
            undefined,
            {
              name: 'CloudinaryError',
              details: errorMessage(cloudinaryError),
            },
          );
        }
      }

      const updatedShop = await this.shops.update(id, {
        name: input.name || shop.name,
        description: input.description || shop.description,
        phoneNumber: input.phoneNumber || shop.phoneNumber,
        address: input.address || shop.address,
        logo: logoUrl,
      });

      return {
        status: 'success',
        message: 'Boutique mise à jour avec succès',
        shop: updatedShop,
      };
    } catch (error) {
      if (isPhoneUniqueViolation(error)) {
        throw new ExpressContractException(
          400,
          shopErrors.update.phoneNumberExists,
          'PHONE_EXISTS',
        );
      }
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class DeleteShopUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(id: number, userId: number) {
    try {
      if (Number.isNaN(id)) {
        throw new ExpressContractException(
          400,
          shopErrors.retrieval.invalidId,
          'INVALID_ID',
        );
      }

      const shop = await this.shops.findById(id);
      if (!shop) {
        throw new ExpressContractException(
          404,
          shopErrors.retrieval.notFound,
          'SHOP_NOT_FOUND',
        );
      }

      if (shop.userId !== userId) {
        throw new ExpressContractException(
          403,
          shopErrors.deletion.notAuthorized,
          'NOT_AUTHORIZED',
        );
      }

      if (shop.logo && shop.logo.includes('cloudinary.com')) {
        try {
          await this.fileStorage.deleteImage(shop.logo, 'shop_logos');
        } catch {
          // Continuer malgré l'erreur
        }
      }

      const products = await this.shops.findProductsWithImages(id);
      for (const product of products) {
        for (const image of product.images ?? []) {
          const url = productImageUrl(image);
          if (url && url.includes('cloudinary.com')) {
            try {
              await this.fileStorage.deleteImage(url, 'product_images');
            } catch {
              // Continuer malgré l'erreur
            }
          }
        }
      }

      await this.shops.deleteProductImagesByShopId(id);
      await this.shops.deleteProductsByShopId(id);
      await this.shops.delete(id);

      return {
        status: 'success',
        message: 'Boutique et tous ses produits supprimés avec succès',
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class ListShopsUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {}

  async execute() {
    try {
      const shops = await this.shops.findAllWithOwnerPreview();
      return {
        status: 'success',
        message:
          shops.length > 0
            ? 'Liste des boutiques récupérée avec succès'
            : 'Aucune boutique disponible',
        shops,
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class GetShopDetailsUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {}

  async execute(id: number) {
    try {
      if (Number.isNaN(id)) {
        throw new ExpressContractException(
          400,
          shopErrors.retrieval.invalidId,
          'INVALID_ID',
        );
      }

      const shop = await this.shops.findByIdWithOwner(id);
      if (!shop) {
        throw new ExpressContractException(
          404,
          shopErrors.retrieval.notFound,
          'SHOP_NOT_FOUND',
        );
      }

      const products = await this.shops.findProductsByShopId(id, {
        orderByCreatedAt: true,
        take: 10,
      });
      const totalProducts = await this.shops.countProducts(id);

      return {
        status: 'success',
        message:
          'Informations de la boutique et du commerçant récupérées avec succès',
        shop,
        products,
        merchantStats: {
          totalProducts,
          memberSince: shop.owner?.createdAt,
        },
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class ContactMerchantUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(EMAIL_SERVICE) private readonly email: EmailServicePort,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(
    shopId: number,
    actor: ShopContactActor | undefined,
    input: { subject?: string; message?: string },
  ) {
    try {
      if (!actor) {
        throw new ExpressContractException(
          401,
          shopErrors.contact.notAuthenticated,
          'NOT_AUTHENTICATED',
        );
      }

      if (!input.subject || !input.message) {
        throw new ExpressContractException(
          400,
          shopErrors.contact.missingFields,
          'MISSING_FIELDS',
        );
      }

      if (Number.isNaN(shopId)) {
        throw new ExpressContractException(
          400,
          shopErrors.retrieval.invalidId,
          'INVALID_ID',
        );
      }

      const shop = await this.shops.findByIdWithOwner(shopId);
      if (!shop) {
        throw new ExpressContractException(
          404,
          shopErrors.retrieval.notFound,
          'SHOP_NOT_FOUND',
        );
      }

      if (shop.owner?.id === actor.id) {
        throw new ExpressContractException(
          400,
          shopErrors.contact.selfContact,
          'SELF_CONTACT',
        );
      }

      const contactMessage = await this.shops.createContact({
        shopId,
        merchantId: shop.owner.id,
        subject: input.subject,
        senderEmail: actor.email ?? '',
        message: input.message,
        status: 'UNREAD',
      });

      try {
        await this.email.sendContactMerchant(
          shop.owner.email,
          input.subject,
          actor.email ?? '',
          input.message,
          shop.name,
        );
      } catch {
        // Continuer malgré l'erreur d'email
      }

      await this.notifications.create({
        userId: shop.owner.id,
        type: 'MESSAGE',
        message: `Nouveau message de ${actor.firstName} ${actor.lastName} concernant votre boutique ${shop.name} : "${input.subject}"`,
        resourceId: contactMessage.id,
        resourceType: 'MerchantContact',
        actionUrl: `/dashboard/messages/${contactMessage.id}`,
        priority: 2,
      });

      try {
        await this.email.sendContactConfirmation(
          actor.email ?? '',
          input.subject,
          shop.name,
          shop.owner.firstName,
        );
      } catch {
        // Continuer malgré l'erreur d'email de confirmation
      }

      return {
        status: 'success',
        message: 'Votre message a été envoyé avec succès au commerçant',
        contact: {
          id: contactMessage.id,
          createdAt: contactMessage.createdAt,
        },
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class RespondToContactUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(EMAIL_SERVICE) private readonly email: EmailServicePort,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(
    contactId: number,
    actor: ShopContactActor | undefined,
    response: string | undefined,
  ) {
    try {
      if (!actor) {
        throw new ExpressContractException(
          401,
          shopErrors.contact.notAuthenticated,
          'NOT_AUTHENTICATED',
        );
      }

      if (!response) {
        throw new ExpressContractException(
          400,
          shopErrors.contact.missingResponse,
          'MISSING_RESPONSE',
        );
      }

      if (Number.isNaN(contactId)) {
        throw new ExpressContractException(
          400,
          shopErrors.contact.invalidMessageId,
          'INVALID_MESSAGE_ID',
        );
      }

      const originalContact = await this.shops.findContactById(contactId);
      if (!originalContact) {
        throw new ExpressContractException(
          404,
          'Message de contact non trouvé',
          'MESSAGE_NOT_FOUND',
        );
      }

      if (originalContact.shop?.owner?.id !== actor.id) {
        throw new ExpressContractException(
          403,
          shopErrors.contact.responseNotAuthorized,
          'NOT_AUTHORIZED_TO_RESPOND',
        );
      }

      const contactResponse = await this.shops.createContactResponse({
        merchantContactId: contactId,
        merchantId: actor.id,
        response,
      });

      await this.shops.markContactResponded(contactId);

      try {
        await this.email.sendContactResponse(
          originalContact.senderEmail,
          originalContact.subject,
          response,
          originalContact.shop.name,
        );
      } catch {
        // Continuer malgré l'erreur d'email
      }

      try {
        const sender = originalContact.senderEmail
          ? await this.users.findByEmail(originalContact.senderEmail)
          : null;

        if (sender) {
          await this.notifications.create({
            userId: sender.id,
            type: 'MESSAGE',
            message: `Le commerçant a répondu à votre message concernant la boutique ${originalContact.shop.name}`,
            resourceId: contactResponse.id,
            resourceType: 'MerchantContactResponse',
            actionUrl: `/dashboard/messages/${contactResponse.id}`,
            priority: 1,
          });
        }
      } catch {
        // Continuer malgré l'erreur de notification
      }

      return {
        status: 'success',
        message: 'Votre réponse a été envoyée avec succès',
        response: {
          id: contactResponse.id,
          createdAt: contactResponse.createdAt,
        },
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}

@Injectable()
export class GetShopMessagesUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {}

  async execute(actor: ShopContactActor | undefined) {
    try {
      if (!actor) {
        throw new ExpressContractException(
          401,
          shopErrors.contact.notAuthenticated,
          'NOT_AUTHENTICATED',
        );
      }

      const contacts = await this.shops.findContactsForUser(
        actor.id,
        actor.email,
      );

      const messages = contacts.map((contact) => ({
        ...contact,
        sender: { email: contact.senderEmail },
      }));

      return {
        status: 'success',
        messages,
        totalCount: messages.length,
      };
    } catch (error) {
      throw unexpectedError(error);
    }
  }
}
