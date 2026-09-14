import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { ProductRepository } from '@domain/repositories/product.repository';
import type { UserRepository } from '@domain/repositories/user.repository';
import type { ShopRepository } from '@domain/repositories/shop.repository';
import type { FileStoragePort } from '@application/ports/output/file-storage.port';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductByIdUseCase,
  SearchProductsUseCase,
  UpdateProductStockUseCase,
} from './product.use-case';

const merchant = {
  id: 1,
  email: 'm@test.com',
  password: 'x',
  role: 'MERCHANT',
  isVerified: true,
  verificationCode: null,
  tokenExpiry: null,
  resetCode: null,
  onboardingStep: 'completed',
  profileCompletion: 100,
  isProfileCompleted: true,
  firstName: 'Ali',
  lastName: 'Fall',
  gender: null,
  dateOfBirth: null,
  phoneNumber: '+22177',
  whatsappNumber: null,
  country: 'SN',
  city: 'Dakar',
  department: null,
  commune: null,
  address: null,
  photo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const shop = {
  id: 10,
  name: 'Chez Ali',
  description: null,
  logo: null,
  phoneNumber: '+221770000000',
  address: null,
  userId: 1,
  verifiedBadge: false,
  status: false,
  categorieShopId: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const product = {
  id: 20,
  name: 'Riz',
  description: 'Sac de 25kg',
  price: 15000,
  stock: 4,
  videoUrl: null,
  status: 'PUBLISHED',
  likesCount: 0,
  commentsCount: 0,
  sharesCount: 0,
  shopId: 10,
  userId: 1,
  categorieProdId: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  shop: { id: 10, name: 'Chez Ali' },
  categorieProd: { id: 3, name: 'Alimentaire', shopCategory: { id: 2, name: 'Food' } },
};

function usersRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return { findById: jest.fn().mockResolvedValue(merchant), ...overrides } as unknown as UserRepository;
}

function shopsRepo(overrides: Partial<ShopRepository> = {}): ShopRepository {
  return { findByUserId: jest.fn().mockResolvedValue(shop), ...overrides } as unknown as ShopRepository;
}

function productsRepo(overrides: Partial<ProductRepository> = {}): ProductRepository {
  return {
    create: jest.fn().mockResolvedValue(product),
    findCreatedView: jest.fn().mockResolvedValue(product),
    findDetailById: jest.fn().mockResolvedValue(product),
    findById: jest.fn().mockResolvedValue(product),
    findFollowerIds: jest.fn().mockResolvedValue([]),
    createImages: jest.fn(),
    deleteImagesByProductId: jest.fn(),
    delete: jest.fn(),
    update: jest.fn().mockResolvedValue(product),
    searchListed: jest.fn(),
    ...overrides,
  } as unknown as ProductRepository;
}

const fileStorage: FileStoragePort = {
  uploadProfilePhoto: jest.fn(),
  deleteProfilePhoto: jest.fn(),
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  uploadVideo: jest.fn(),
  deleteVideo: jest.fn(),
  uploadMessageMedia: jest.fn(),
  deleteMessageMedia: jest.fn(),
};

const notifications: NotificationServicePort = {
  create: jest.fn().mockResolvedValue(undefined),
};

describe('CreateProductUseCase', () => {
  it('refuse les champs manquants', async () => {
    const useCase = new CreateProductUseCase(
      usersRepo(),
      shopsRepo(),
      productsRepo(),
      fileStorage,
      notifications,
    );

    await expect(useCase.execute(1, { name: 'Riz' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'MISSING_REQUIRED_FIELDS',
    });
  });

  it('refuse un utilisateur sans boutique', async () => {
    const useCase = new CreateProductUseCase(
      usersRepo(),
      shopsRepo({ findByUserId: jest.fn().mockResolvedValue(null) }),
      productsRepo(),
      fileStorage,
      notifications,
    );

    await expect(
      useCase.execute(1, {
        name: 'Riz',
        description: 'Sac',
        price: 10,
        stock: 2,
        categorieProdId: 3,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_SHOP' });
  });

  it('crée un produit en DRAFT par défaut', async () => {
    const products = productsRepo();
    const useCase = new CreateProductUseCase(
      usersRepo(),
      shopsRepo(),
      products,
      fileStorage,
      notifications,
    );

    const result = await useCase.execute(1, {
      name: 'Riz',
      description: 'Sac',
      price: 10,
      stock: 2,
      categorieProdId: 3,
    });

    expect(result.status).toBe('success');
    expect(products.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DRAFT', shopId: 10, userId: 1 }),
    );
  });
});

describe('GetProductByIdUseCase', () => {
  it('renvoie 404 { message } comme Express', async () => {
    const useCase = new GetProductByIdUseCase(
      productsRepo({ findDetailById: jest.fn().mockResolvedValue(null) }),
    );

    await expect(useCase.execute(99)).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Produit non trouvé' },
    });
  });

  it('ajoute isLiked', async () => {
    const useCase = new GetProductByIdUseCase(
      productsRepo({
        findDetailById: jest.fn().mockResolvedValue({ ...product, likes: [{ id: 1, type: 'LIKE' }] }),
      }),
    );

    const result = await useCase.execute(20, 1);
    expect(result.isLiked).toBe(true);
    expect(result._count.likes).toBe(0);
  });
});

describe('SearchProductsUseCase', () => {
  it('exige un terme de recherche', async () => {
    const useCase = new SearchProductsUseCase(productsRepo());

    await expect(useCase.execute({})).rejects.toBeInstanceOf(ExpressContractException);
  });
});

describe('DeleteProductUseCase', () => {
  it('refuse la suppression par un autre utilisateur', async () => {
    const useCase = new DeleteProductUseCase(productsRepo());

    await expect(useCase.execute(20, 99)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('UpdateProductStockUseCase', () => {
  it('refuse un stock invalide', async () => {
    const useCase = new UpdateProductStockUseCase(productsRepo());

    await expect(useCase.execute(20, 1, -1)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
