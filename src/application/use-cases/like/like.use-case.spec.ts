import type { LikeRepository } from '@domain/repositories/like.repository';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import {
  GetProductLikesUseCase,
  GetUserReactionUseCase,
  ToggleDislikeUseCase,
  ToggleLikeUseCase,
} from './like.use-case';

const product = {
  id: 20,
  name: 'Riz',
  userId: 2,
  status: 'PUBLISHED',
};

function likesRepo(overrides: Partial<LikeRepository> = {}): LikeRepository {
  return {
    findPublishedProduct: jest.fn().mockResolvedValue(product),
    findProductById: jest.fn().mockResolvedValue(product),
    findReaction: jest.fn().mockResolvedValue(null),
    deleteReaction: jest.fn(),
    createReaction: jest.fn(),
    incrementLikesCount: jest.fn(),
    decrementLikesCount: jest.fn(),
    countByType: jest
      .fn()
      .mockImplementation((_productId: number, type: string) =>
        Promise.resolve(type === 'LIKE' ? 3 : 1),
      ),
    findUserNames: jest.fn().mockResolvedValue({
      firstName: 'Awa',
      lastName: 'Diop',
    }),
    findReactionsPaged: jest.fn().mockResolvedValue({ likes: [], total: 0 }),
    ...overrides,
  } as unknown as LikeRepository;
}

function notifications(): NotificationServicePort {
  return { create: jest.fn() };
}

describe('ToggleLikeUseCase', () => {
  it('refuse un produit non publié', async () => {
    const useCase = new ToggleLikeUseCase(
      likesRepo({ findPublishedProduct: jest.fn().mockResolvedValue(null) }),
      notifications(),
    );

    await expect(useCase.execute(8, 20)).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Produit non trouvé ou non publié' },
    });
  });

  it('retire un like existant', async () => {
    const likes = likesRepo({
      findReaction: jest.fn().mockResolvedValue({ id: 11, type: 'LIKE' }),
    });
    const result = await new ToggleLikeUseCase(likes, notifications()).execute(
      8,
      20,
    );

    expect(result).toMatchObject({
      message: "Vous n'aimez plus ce produit",
      action: 'unliked',
      likesCount: 3,
      dislikesCount: 1,
    });
    expect(likes.deleteReaction).toHaveBeenCalledWith(11);
    expect(likes.decrementLikesCount).toHaveBeenCalledWith(20);
  });

  it('ajoute un like et notifie le propriétaire', async () => {
    const likes = likesRepo();
    const notify = notifications();
    const result = await new ToggleLikeUseCase(likes, notify).execute(8, 20);

    expect(result).toMatchObject({
      message: 'Vous aimez ce produit',
      action: 'liked',
    });
    expect(likes.createReaction).toHaveBeenCalledWith({
      productId: 20,
      userId: 8,
      type: 'LIKE',
    });
    expect(notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2,
        type: 'PRODUCT_LIKE',
        priority: 1,
      }),
    );
  });
});

describe('ToggleDislikeUseCase', () => {
  it('annule un dislike existant', async () => {
    const likes = likesRepo({
      findReaction: jest.fn().mockResolvedValue({ id: 12, type: 'DISLIKE' }),
    });
    const result = await new ToggleDislikeUseCase(likes).execute(8, 20);

    expect(result).toMatchObject({
      message: 'Vous avez annulé votre dislike',
      action: 'undisliked',
    });
    expect(likes.deleteReaction).toHaveBeenCalledWith(12);
    expect(likes.incrementLikesCount).toHaveBeenCalledWith(20);
  });
});

describe('GetProductLikesUseCase', () => {
  it('renvoie 404 si le produit n’existe pas', async () => {
    const useCase = new GetProductLikesUseCase(
      likesRepo({ findProductById: jest.fn().mockResolvedValue(null) }),
    );

    await expect(useCase.execute(99)).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Produit non trouvé' },
    });
  });
});

describe('GetUserReactionUseCase', () => {
  it('renvoie hasReaction false s’il n’y a pas de réaction', async () => {
    const result = await new GetUserReactionUseCase(likesRepo()).execute(8, 20);

    expect(result).toEqual({ hasReaction: false, type: null });
  });

  it('renvoie le type de réaction existant', async () => {
    const result = await new GetUserReactionUseCase(
      likesRepo({
        findReaction: jest.fn().mockResolvedValue({ type: 'LIKE' }),
      }),
    ).execute(8, 20);

    expect(result).toEqual({ hasReaction: true, type: 'LIKE' });
  });
});
