import { existsSync, unlinkSync } from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { UploadedProductFile } from '@domain/entities/product.entity';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '@domain/repositories/product.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '@domain/repositories/shop.repository';
import {
  FILE_STORAGE,
  type FileStoragePort,
} from '@application/ports/output/file-storage.port';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import { BUNNY_CDN_HOST, NODE_ENV } from '@application/config/env';

export type ProductQuery = Record<string, string | string[] | undefined>;

export type ProductMediaFiles = {
  productImages?: UploadedProductFile[];
  video?: UploadedProductFile[];
};

const productErrors = {
  notFound: 'Produit non trouvé',
  userNotFound: 'Utilisateur non trouvé',
  notMerchant: 'Seuls les commerçants peuvent créer des produits',
  noShop: "Vous devez d'abord créer une boutique",
  uploadFailed: 'Échec du téléchargement des images',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function queryValue(query: ProductQuery, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function unlinkIfExists(filePath?: string) {
  if (filePath && existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

/** Vrai si l'URL pointe vers un média hébergé par notre stockage (Cloudinary/Bunny). */
export function isManagedMediaUrl(url?: string | null): boolean {
  if (!url) {
    return false;
  }
  if (url.includes('cloudinary') || url.includes('bunnycdn.com')) {
    return true;
  }
  if (BUNNY_CDN_HOST && url.includes(BUNNY_CDN_HOST)) {
    return true;
  }
  return false;
}

export function cleanupProductFiles(files?: ProductMediaFiles) {
  if (!files) {
    return;
  }
  for (const file of files.productImages ?? []) {
    unlinkIfExists(file.path);
  }
  for (const file of files.video ?? []) {
    unlinkIfExists(file.path);
  }
}

function parseJsonArray(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }
  return [];
}

function formatListedProduct(product: any, userId?: number) {
  const isLiked = userId ? (product.likes?.length ?? 0) > 0 : false;
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    videoUrl: product.videoUrl,
    categorieProdId: product.categorieProdId,
    categorieProd: product.categorieProd,
    shopId: product.shopId,
    userId: product.userId,
    status: product.status,
    likesCount: Math.max(0, product.likesCount ?? 0),
    commentsCount: Math.max(0, product.commentsCount ?? 0),
    sharesCount: Math.max(0, product.sharesCount ?? 0),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    images: product.images,
    shop: product.shop,
    _count: {
      likes: Math.max(0, product.likesCount ?? 0),
      comments: Math.max(0, product.commentsCount ?? 0),
      shares: Math.max(0, product.sharesCount ?? 0),
    },
    isLiked,
  };
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(
    userId: number,
    input: {
      name?: string;
      description?: string;
      price?: string | number;
      stock?: string | number;
      videoUrl?: string;
      categorieProdId?: string | number;
      status?: string;
    },
    files?: ProductMediaFiles,
  ) {
    try {
      const { name, description, price, stock, videoUrl, categorieProdId, status } =
        input;

      if (!name || !description || !price || !stock || !categorieProdId) {
        throw new ExpressContractException(
          400,
          'Champs requis manquants',
          'MISSING_REQUIRED_FIELDS',
          { details: 'Nom, description, prix, stock et catégorie sont obligatoires' },
        );
      }

      const user = await this.users.findById(userId);
      if (!user) {
        throw new ExpressContractException(
          404,
          productErrors.userNotFound,
          'USER_NOT_FOUND',
        );
      }

      if (user.role !== 'MERCHANT') {
        throw new ExpressContractException(
          403,
          productErrors.notMerchant,
          'NOT_MERCHANT',
        );
      }

      const shop = await this.shops.findByUserId(userId);
      if (!shop) {
        throw new ExpressContractException(403, productErrors.noShop, 'NO_SHOP');
      }

      const parsedPrice = parseFloat(String(price));
      const parsedStock = parseInt(String(stock), 10);

      if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new ExpressContractException(
          400,
          'Le prix doit être un nombre positif',
          'INVALID_PRICE',
          { details: `Valeur reçue: ${price}` },
        );
      }

      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        throw new ExpressContractException(
          400,
          'Le stock doit être un nombre entier positif ou zéro',
          'INVALID_STOCK',
          { details: `Valeur reçue: ${stock}` },
        );
      }

      const productStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
      let finalVideoUrl = videoUrl;
      const videoFile = files?.video?.[0];

      if (videoFile) {
        try {
          finalVideoUrl = await this.fileStorage.uploadVideo(
            videoFile.path,
            'product_videos',
          );
          unlinkIfExists(videoFile.path);
        } catch (cloudinaryError) {
          throw new ExpressContractException(
            500,
            "Échec de l'upload de la vidéo",
            'VIDEO_UPLOAD_FAILED',
            { details: errorMessage(cloudinaryError) },
          );
        }
      }

      const newProduct = await this.products.create({
        name: String(name).trim(),
        description: String(description).trim(),
        price: parsedPrice,
        stock: parsedStock,
        videoUrl: finalVideoUrl,
        categorieProdId: parseInt(String(categorieProdId), 10),
        status: productStatus,
        shopId: shop.id,
        userId,
      });

      const productImages: { productId: number; imageUrl: string }[] = [];
      const imageUploadErrors: string[] = [];

      for (const file of files?.productImages ?? []) {
        try {
          const imageUrl = await this.fileStorage.uploadImage(
            file.path,
            'product_images',
          );
          productImages.push({ productId: newProduct.id, imageUrl });
          unlinkIfExists(file.path);
        } catch (cloudinaryError) {
          imageUploadErrors.push(
            `Image ${file.originalname}: ${errorMessage(cloudinaryError)}`,
          );
          unlinkIfExists(file.path);
        }
      }

      if (productImages.length > 0) {
        await this.products.createImages(productImages);
      }

      if (productStatus === 'PUBLISHED') {
        try {
          const followerIds = await this.products.findFollowerIds(userId);
          const merchantName = `${user.firstName || 'Marchand'} ${user.lastName || ''}`;
          for (const followerId of followerIds) {
            await this.notifications.create({
              userId: followerId,
              type: 'PRODUCT',
              message: `${merchantName} a publié un nouveau produit: ${newProduct.name}`,
              actionUrl: `/products/${newProduct.id}`,
              resourceId: newProduct.id,
              resourceType: 'Product',
              priority: 2,
            });
          }
        } catch {
          // Ne pas faire échouer la création pour une erreur de notification
        }
      }

      const productWithImages = await this.products.findCreatedView(newProduct.id);
      const response: Record<string, unknown> = {
        status: 'success',
        message: 'Produit créé avec succès',
        product: productWithImages,
      };
      if (imageUploadErrors.length > 0) {
        response.warnings = {
          imageUploadErrors,
          message: `${imageUploadErrors.length} image(s) n'ont pas pu être uploadées`,
        };
      }
      return response;
    } catch (error) {
      cleanupProductFiles(files);
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw new ExpressContractException(
        500,
        'Erreur lors de la création du produit',
        'CREATION_FAILED',
        {
          details:
            NODE_ENV === 'development'
              ? errorMessage(error)
              : "Une erreur inattendue s'est produite",
        },
      );
    }
  }
}

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(query: ProductQuery = {}, userId?: number) {
    try {
      const page = parseInt(queryValue(query, 'page') ?? '1', 10) || 1;
      const limit = parseInt(queryValue(query, 'limit') ?? '10', 10) || 10;
      const status = queryValue(query, 'status') ?? 'PUBLISHED';
      const category = queryValue(query, 'category');
      const search = queryValue(query, 'search');
      const minPrice = queryValue(query, 'minPrice');
      const maxPrice = queryValue(query, 'maxPrice');
      const sortBy = queryValue(query, 'sortBy');
      const order = queryValue(query, 'order');

      const { products, total } = await this.products.findListed(
        {
          status,
          categoryId: category ? parseInt(category, 10) : undefined,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          sortBy,
          order: order?.toLowerCase() === 'desc' ? 'desc' : 'asc',
          page,
          limit,
          search: search?.trim() || undefined,
        },
        userId,
      );

      return {
        products: products.map((product) => formatListedProduct(product, userId)),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération des produits',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetProductByIdUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(id: number, userId?: number) {
    try {
      const product = await this.products.findDetailById(id, userId);
      if (!product) {
        throw ExpressContractException.raw(404, { message: 'Produit non trouvé' });
      }
      return formatListedProduct(product, userId);
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération du produit',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(
    id: number,
    userId: number,
    input: {
      name?: string;
      description?: string;
      price?: string | number;
      stock?: string | number;
      videoUrl?: string;
      categorieProdId?: string | number;
      images?: string[] | string;
    },
  ) {
    try {
      const product = await this.products.findByIdWithImages(id);
      if (!product) {
        throw ExpressContractException.raw(404, { message: 'Produit non trouvé' });
      }
      if (product.userId !== userId) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à modifier ce produit",
        });
      }

      await this.products.update(id, {
        name: input.name,
        description: input.description,
        price: input.price ? parseFloat(String(input.price)) : undefined,
        stock: input.stock ? parseInt(String(input.stock), 10) : undefined,
        videoUrl: input.videoUrl,
        categorieProdId: input.categorieProdId
          ? parseInt(String(input.categorieProdId), 10)
          : undefined,
        updatedAt: new Date(),
      });

      const images = Array.isArray(input.images)
        ? input.images
        : typeof input.images === 'string' && input.images
          ? parseJsonArray(input.images)
          : [];

      if (images.length > 0) {
        await this.products.deleteImagesByProductId(id);
        await this.products.createImages(
          images.map((imageUrl) => ({ productId: id, imageUrl })),
        );
      }

      const productWithImages = await this.products.findByIdWithImages(id);
      return {
        message: 'Produit mis à jour avec succès',
        product: productWithImages,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la mise à jour du produit',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class UpdateProductWithImagesUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(
    id: number,
    userId: number,
    input: {
      name?: string;
      description?: string;
      categorieProdId?: string | number;
      price?: string | number;
      stock?: string | number;
      videoUrl?: string;
      existingImageUrls?: string;
      imagesToDelete?: string;
    },
    files?: ProductMediaFiles,
  ) {
    try {
      const existingProduct = await this.products.findByIdWithImages(id);
      if (!existingProduct) {
        throw new ExpressContractException(
          404,
          'Produit non trouvé',
          'PRODUCT_NOT_FOUND',
        );
      }
      if (existingProduct.userId !== userId) {
        throw new ExpressContractException(
          403,
          "Vous n'êtes pas autorisé à modifier ce produit",
          'UNAUTHORIZED',
        );
      }

      let imagesToKeep: string[] = [];
      let imagesToRemove: string[] = [];
      try {
        imagesToKeep = parseJsonArray(input.existingImageUrls);
        imagesToRemove = parseJsonArray(input.imagesToDelete);
      } catch {
        throw new ExpressContractException(
          400,
          "Format des données d'images invalide",
          'INVALID_JSON',
        );
      }

      if (imagesToRemove.length > 0) {
        try {
          await this.products.deleteImagesByUrls(id, imagesToRemove);
          for (const imageUrl of imagesToRemove) {
            if (isManagedMediaUrl(imageUrl)) {
              try {
                await this.fileStorage.deleteImage(imageUrl, 'product_images');
              } catch {
                // Continuer malgré l'erreur de stockage
              }
            }
          }
        } catch {
          throw new ExpressContractException(
            500,
            'Erreur lors de la suppression des images',
            'DELETE_IMAGES_FAILED',
          );
        }
      }

      const newImageUrls: string[] = [];
      const imageUploadErrors: string[] = [];
      for (const file of files?.productImages ?? []) {
        try {
          const url = await this.fileStorage.uploadImage(file.path, 'product_images');
          newImageUrls.push(url);
          unlinkIfExists(file.path);
        } catch (cloudinaryError) {
          imageUploadErrors.push(
            `Image ${file.originalname}: ${errorMessage(cloudinaryError)}`,
          );
          unlinkIfExists(file.path);
        }
      }

      if (newImageUrls.length > 0) {
        try {
          await this.products.createImages(
            newImageUrls.map((imageUrl) => ({ productId: id, imageUrl })),
          );
        } catch {
          throw new ExpressContractException(
            500,
            "Erreur lors de l'ajout des nouvelles images",
            'ADD_IMAGES_FAILED',
          );
        }
      }

      let finalVideoUrl = input.videoUrl;
      const videoFile = files?.video?.[0];
      if (videoFile) {
        try {
          if (isManagedMediaUrl(existingProduct.videoUrl)) {
            try {
              await this.fileStorage.deleteVideo(
                existingProduct.videoUrl,
                'product_videos',
              );
            } catch {
              // Continuer
            }
          }
          finalVideoUrl = await this.fileStorage.uploadVideo(
            videoFile.path,
            'product_videos',
          );
          unlinkIfExists(videoFile.path);
        } catch (cloudinaryError) {
          throw new ExpressContractException(
            500,
            "Échec de l'upload de la vidéo",
            'VIDEO_UPLOAD_FAILED',
            { details: errorMessage(cloudinaryError) },
          );
        }
      } else if (input.videoUrl === undefined) {
        finalVideoUrl = existingProduct.videoUrl;
      } else if (!input.videoUrl) {
        const oldVideo = existingProduct.videoUrl as string | undefined;
        if (oldVideo && isManagedMediaUrl(oldVideo)) {
          try {
            await this.fileStorage.deleteVideo(oldVideo, 'product_videos');
          } catch {
            // Continuer malgré l'erreur de stockage
          }
        }
      }

      let parsedPrice = existingProduct.price;
      let parsedStock = existingProduct.stock;
      if (input.price !== undefined) {
        parsedPrice = parseFloat(String(input.price));
        if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
          throw new ExpressContractException(
            400,
            'Le prix doit être un nombre positif',
            'INVALID_PRICE',
            { details: `Valeur reçue: ${input.price}` },
          );
        }
      }
      if (input.stock !== undefined) {
        parsedStock = parseInt(String(input.stock), 10);
        if (Number.isNaN(parsedStock) || parsedStock < 0) {
          throw new ExpressContractException(
            400,
            'Le stock doit être un nombre entier positif ou zéro',
            'INVALID_STOCK',
            { details: `Valeur reçue: ${input.stock}` },
          );
        }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) {
        updateData.name = String(input.name).trim();
      }
      if (input.description !== undefined) {
        updateData.description = String(input.description).trim();
      }
      if (input.categorieProdId !== undefined) {
        updateData.categorieProdId = parseInt(String(input.categorieProdId), 10);
      }
      if (input.price !== undefined) {
        updateData.price = parsedPrice;
      }
      if (input.stock !== undefined) {
        updateData.stock = parsedStock;
      }
      if (finalVideoUrl !== existingProduct.videoUrl) {
        updateData.videoUrl = finalVideoUrl;
      }

      try {
        await this.products.update(id, updateData);
        const updatedProduct = await this.products.findUpdatedView(id);
        const response: Record<string, unknown> = {
          status: 'success',
          message: 'Produit mis à jour avec succès',
          product: updatedProduct,
          stats: {
            imagesConservees: imagesToKeep.length,
            imagesSupprimees: imagesToRemove.length,
            nouvellesImages: newImageUrls.length,
            totalFinal: updatedProduct.images.length,
          },
        };
        if (imageUploadErrors.length > 0) {
          response.warnings = {
            imageUploadErrors,
            message: `${imageUploadErrors.length} image(s) n'ont pas pu être uploadées`,
          };
        }
        return response;
      } catch (updateError) {
        if (updateError instanceof ExpressContractException) {
          throw updateError;
        }
        throw new ExpressContractException(
          500,
          'Erreur lors de la mise à jour du produit',
          'UPDATE_FAILED',
          { details: errorMessage(updateError) },
        );
      }
    } catch (error) {
      cleanupProductFiles(files);
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw new ExpressContractException(
        500,
        'Une erreur est survenue lors de la mise à jour du produit',
        'UPDATE_FAILED',
        {
          details:
            NODE_ENV === 'development'
              ? errorMessage(error)
              : "Une erreur inattendue s'est produite",
        },
      );
    }
  }
}

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(id: number, userId: number) {
    try {
      const product = (await this.products.findByIdWithImages(id)) as {
        userId: number;
        videoUrl?: string | null;
        images?: { imageUrl?: string; url?: string }[];
      } | null;
      if (!product) {
        throw ExpressContractException.raw(404, { message: 'Produit non trouvé' });
      }
      if (product.userId !== userId) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à supprimer ce produit",
        });
      }

      for (const image of product.images ?? []) {
        const url = image.imageUrl ?? image.url;
        if (url && isManagedMediaUrl(url)) {
          try {
            await this.fileStorage.deleteImage(url, 'product_images');
          } catch {
            // Continuer malgré l'erreur de stockage
          }
        }
      }

      const videoUrl = product.videoUrl;
      if (videoUrl && isManagedMediaUrl(videoUrl)) {
        try {
          await this.fileStorage.deleteVideo(videoUrl, 'product_videos');
        } catch {
          // Continuer malgré l'erreur de stockage
        }
      }

      await this.products.deleteImagesByProductId(id);
      await this.products.delete(id);
      return { message: 'Produit supprimé avec succès' };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la suppression du produit',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class UpdateProductStockUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(id: number, userId: number, stock: number | string | undefined) {
    try {
      const product = await this.products.findById(id);
      if (!product) {
        throw ExpressContractException.raw(404, { message: 'Produit non trouvé' });
      }
      if (product.userId !== userId) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à modifier ce produit",
        });
      }
      if (stock === undefined || Number(stock) < 0) {
        throw ExpressContractException.raw(400, {
          message: 'Veuillez fournir une valeur de stock valide',
        });
      }
      const updatedProduct = await this.products.update(id, {
        stock: parseInt(String(stock), 10),
        updatedAt: new Date(),
      });
      return {
        message: 'Stock du produit mis à jour avec succès',
        product: updatedProduct,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la mise à jour du stock',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class UpdateProductStatusUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(id: number, userId: number, status?: string) {
    try {
      const product = await this.products.findById(id);
      if (!product) {
        throw ExpressContractException.raw(404, {
          message: 'Produit non trouvé',
        });
      }
      if (product.userId !== userId) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à modifier ce produit",
        });
      }
      if (status !== 'DRAFT' && status !== 'PUBLISHED') {
        throw ExpressContractException.raw(400, {
          message: 'Statut invalide (DRAFT ou PUBLISHED attendu)',
        });
      }
      const updatedProduct = await this.products.update(id, {
        status,
        updatedAt: new Date(),
      });
      return {
        message: 'Statut du produit mis à jour avec succès',
        product: updatedProduct,
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la mise à jour du statut',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetMerchantProductsUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(merchantId: number, query: ProductQuery = {}) {
    try {
      const merchant = await this.users.findById(merchantId);
      if (!merchant) {
        throw ExpressContractException.raw(404, {
          message: 'Commerçant non trouvé',
        });
      }
      if (merchant.role !== 'MERCHANT') {
        throw ExpressContractException.raw(400, {
          message: "L'utilisateur spécifié n'est pas un commerçant",
        });
      }
      const page = parseInt(queryValue(query, 'page') ?? '1', 10) || 1;
      const limit = parseInt(queryValue(query, 'limit') ?? '10', 10) || 10;
      const { products, total } = await this.products.findByUserIdPaged(
        merchantId,
        page,
        limit,
      );
      return {
        products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération des produits',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class SearchProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(query: ProductQuery = {}, userId?: number) {
    try {
      const search = queryValue(query, 'query');
      if (!search) {
        throw ExpressContractException.raw(400, {
          message: 'Veuillez fournir un terme de recherche',
        });
      }
      const page = parseInt(queryValue(query, 'page') ?? '1', 10) || 1;
      const limit = parseInt(queryValue(query, 'limit') ?? '10', 10) || 10;
      const category = queryValue(query, 'category');
      const { products, total } = await this.products.searchListed(
        {
          search,
          categoryId: category ? parseInt(category, 10) : undefined,
          minPrice: queryValue(query, 'minPrice')
            ? parseFloat(queryValue(query, 'minPrice') as string)
            : undefined,
          maxPrice: queryValue(query, 'maxPrice')
            ? parseFloat(queryValue(query, 'maxPrice') as string)
            : undefined,
          page,
          limit,
          order: 'desc',
        },
        userId,
      );
      const totalPages = Math.ceil(total / limit);
      return {
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: parseFloat(String(product.price)),
          stock: product.stock,
          videoUrl: product.videoUrl,
          categorieProdId: product.categorieProdId,
          categorieProd: product.categorieProd
            ? {
                id: product.categorieProd.id,
                name: product.categorieProd.name,
                categorieShop: product.categorieProd.shopCategory,
              }
            : null,
          shopId: product.shopId,
          status: product.status,
          images: product.images || [],
          shop: product.shop || null,
          isLiked: userId ? (product.likes?.length ?? 0) > 0 : false,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
        },
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la recherche de produits',
        error: errorMessage(error),
        details: NODE_ENV === 'development' ? (error as Error).stack : undefined,
      });
    }
  }
}

@Injectable()
export class GetProductsByCategoryUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(categoryId: number, query: ProductQuery = {}) {
    try {
      const page = parseInt(queryValue(query, 'page') ?? '1', 10) || 1;
      const limit = parseInt(queryValue(query, 'limit') ?? '10', 10) || 10;
      const [{ products, total }, categorieProd] = await Promise.all([
        this.products.findByCategoryPaged(categoryId, page, limit),
        this.products.findCategorieProdById(categoryId),
      ]);
      return {
        categorieProd,
        products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération des produits',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetLatestProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(query: ProductQuery = {}) {
    try {
      const limit = parseInt(queryValue(query, 'limit') ?? '10', 10) || 10;
      return await this.products.findLatest(limit);
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération des produits',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetFeaturedProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(query: ProductQuery = {}) {
    try {
      const limit = parseInt(queryValue(query, 'limit') ?? '10', 10) || 10;
      return await this.products.findFeatured(limit);
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération des produits',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetProductCategoriesUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute() {
    try {
      return await this.products.findAllCategories();
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Une erreur est survenue lors de la récupération des catégories',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetProductStatsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(userId: number) {
    try {
      const [totalProducts, lowStockCount, categoryStats] = await Promise.all([
        this.products.countByUserId(userId),
        this.products.countLowStock(userId),
        this.products.groupCountByCategory(userId),
      ]);
      return { totalProducts, lowStockCount, categoryStats };
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message:
          'Une erreur est survenue lors de la récupération des statistiques',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetRelatedProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(id: number, query: ProductQuery = {}) {
    try {
      const currentProduct = await this.products.findById(id);
      if (!currentProduct) {
        throw ExpressContractException.raw(404, { message: 'Produit non trouvé' });
      }
      const limit = parseInt(queryValue(query, 'limit') ?? '5', 10) || 5;
      return await this.products.findRelated(
        id,
        currentProduct.categorieProdId,
        limit,
      );
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message:
          'Une erreur est survenue lors de la récupération des produits associés',
        error: errorMessage(error),
      });
    }
  }
}
