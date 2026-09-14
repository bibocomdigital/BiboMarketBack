import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { ShopRepository } from '@domain/repositories/shop.repository';
import type { UserRepository } from '@domain/repositories/user.repository';
import type { FileStoragePort } from '@application/ports/output/file-storage.port';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import type { EmailServicePort } from '@application/ports/output/email-service.port';
import {
  ContactMerchantUseCase,
  CreateShopUseCase,
  DeleteShopUseCase,
  GetMyShopUseCase,
  GetShopByIdUseCase,
  GetShopProductsUseCase,
} from './shop.use-case';

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

function usersRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: jest.fn().mockResolvedValue(merchant),
    ...overrides,
  } as unknown as UserRepository;
}

function shopsRepo(overrides: Partial<ShopRepository> = {}): ShopRepository {
  return {
    findByUserId: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(shop),
    create: jest.fn().mockResolvedValue(shop),
    findProductsByShopId: jest.fn().mockResolvedValue([]),
    findFilteredProducts: jest.fn().mockResolvedValue({ products: [], total: 0 }),
    findProductsWithImages: jest.fn().mockResolvedValue([]),
    deleteProductImagesByShopId: jest.fn(),
    deleteProductsByShopId: jest.fn(),
    delete: jest.fn(),
    createContact: jest.fn(),
    findByIdWithOwner: jest.fn(),
    ...overrides,
  } as unknown as ShopRepository;
}

const fileStorage: FileStoragePort = {
  uploadProfilePhoto: jest.fn(),
  deleteProfilePhoto: jest.fn(),
  uploadImage: jest.fn().mockResolvedValue('https://cloudinary.com/logo.png'),
  deleteImage: jest.fn(),
  uploadVideo: jest.fn(),
  deleteVideo: jest.fn(),
  uploadMessageMedia: jest.fn(),
  deleteMessageMedia: jest.fn(),
};

const notifications: NotificationServicePort = {
  create: jest.fn().mockResolvedValue(undefined),
};

const email: EmailServicePort = {
  sendPasswordReset: jest.fn(),
  sendWelcome: jest.fn(),
  sendContactMerchant: jest.fn(),
  sendContactConfirmation: jest.fn(),
  sendContactResponse: jest.fn(),
};

describe('CreateShopUseCase', () => {
  it('refuse un utilisateur qui n’est pas commerçant', async () => {
    const users = usersRepo({
      findById: jest.fn().mockResolvedValue({ ...merchant, role: 'CLIENT' }),
    });
    const useCase = new CreateShopUseCase(
      users,
      shopsRepo(),
      fileStorage,
      notifications,
    );

    await expect(
      useCase.execute({ userId: 1, name: 'Chez Ali', phoneNumber: '770' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'NOT_MERCHANT',
    });
  });

  it('refuse une deuxième boutique', async () => {
    const useCase = new CreateShopUseCase(
      usersRepo(),
      shopsRepo({ findByUserId: jest.fn().mockResolvedValue(shop) }),
      fileStorage,
      notifications,
    );

    await expect(
      useCase.execute({ userId: 1, name: 'Chez Ali', phoneNumber: '770' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'SHOP_EXISTS',
    });
  });

  it('crée une boutique et notifie le commerçant', async () => {
    const shops = shopsRepo();
    const useCase = new CreateShopUseCase(
      usersRepo(),
      shops,
      fileStorage,
      notifications,
    );

    const result = await useCase.execute({
      userId: 1,
      name: 'Chez Ali',
      phoneNumber: '770',
      categorieShopId: 2,
    });

    expect(result).toEqual({
      status: 'success',
      message: 'Boutique créée avec succès',
      shop,
    });
    expect(shops.create).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SHOP', userId: 1 }),
    );
  });
});

describe('GetMyShopUseCase', () => {
  it('renvoie 404 si l’utilisateur n’a pas de boutique', async () => {
    const useCase = new GetMyShopUseCase(shopsRepo());

    await expect(useCase.execute(1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NO_SHOP_OWNED',
    });
  });
});

describe('GetShopByIdUseCase', () => {
  it('refuse un id invalide', async () => {
    const useCase = new GetShopByIdUseCase(shopsRepo());

    await expect(useCase.execute(Number.NaN)).rejects.toBeInstanceOf(
      ExpressContractException,
    );
  });
});

describe('GetShopProductsUseCase', () => {
  it('renvoie le message vide Express quand il n’y a pas de produits', async () => {
    const useCase = new GetShopProductsUseCase(shopsRepo());

    const result = await useCase.execute(10, { page: '1', limit: '10' });

    expect(result.status).toBe('success');
    expect(result.message).toBe(
      'Aucun produit disponible pour cette boutique',
    );
    expect(result.pagination).toEqual({
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
  });
});

describe('ContactMerchantUseCase', () => {
  it('refuse un contact vers sa propre boutique', async () => {
    const shops = shopsRepo({
      findByIdWithOwner: jest.fn().mockResolvedValue({
        ...shop,
        owner: { id: 1, firstName: 'Ali', lastName: 'Fall', email: 'm@test.com' },
      }),
    });
    const useCase = new ContactMerchantUseCase(shops, email, notifications);

    await expect(
      useCase.execute(
        10,
        { id: 1, email: 'm@test.com', firstName: 'Ali', lastName: 'Fall' },
        { subject: 'Hello', message: 'Bonjour' },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'SELF_CONTACT',
    });
  });
});

describe('DeleteShopUseCase', () => {
  it('refuse la suppression par un autre utilisateur', async () => {
    const useCase = new DeleteShopUseCase(shopsRepo(), fileStorage);

    await expect(useCase.execute(10, 99)).rejects.toMatchObject({
      statusCode: 403,
      code: 'NOT_AUTHORIZED',
    });
  });

  it('supprime les images via imageUrl', async () => {
    const shops = shopsRepo({
      findProductsWithImages: jest.fn().mockResolvedValue([
        {
          images: [
            { imageUrl: 'https://res.cloudinary.com/demo/product_images/a.jpg' },
          ],
        },
      ]),
    });
    const storage = {
      ...fileStorage,
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new DeleteShopUseCase(shops, storage);

    await expect(useCase.execute(10, 1)).resolves.toEqual({
      status: 'success',
      message: 'Boutique et tous ses produits supprimés avec succès',
    });
    expect(storage.deleteImage).toHaveBeenCalledWith(
      'https://res.cloudinary.com/demo/product_images/a.jpg',
      'product_images',
    );
  });
});
