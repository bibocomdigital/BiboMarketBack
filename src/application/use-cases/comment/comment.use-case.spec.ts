import type { CommentRepository } from '@domain/repositories/comment.repository';
import type { NotificationServicePort } from '@application/ports/output/notification.port';
import {
  AddCommentUseCase,
  DeleteCommentUseCase,
  GetProductCommentsUseCase,
  ReplyToCommentUseCase,
  UpdateCommentUseCase,
} from './comment.use-case';

const product = {
  id: 20,
  name: 'Riz',
  userId: 2,
  status: 'PUBLISHED',
};

const comment = {
  id: 5,
  productId: 20,
  userId: 8,
  comment: 'Bon produit',
  product,
};

function commentsRepo(
  overrides: Partial<CommentRepository> = {},
): CommentRepository {
  return {
    findPublishedProduct: jest.fn().mockResolvedValue(product),
    findProductById: jest.fn().mockResolvedValue(product),
    createComment: jest.fn().mockResolvedValue({ id: 5 }),
    incrementCommentsCount: jest.fn(),
    decrementCommentsCount: jest.fn(),
    findCommentWithUser: jest.fn().mockResolvedValue({
      ...comment,
      user: { id: 8, firstName: 'Awa', lastName: 'Diop', photo: null },
    }),
    findCommentsPaged: jest.fn().mockResolvedValue({
      comments: [comment],
      total: 1,
    }),
    findCommentWithProduct: jest.fn().mockResolvedValue(comment),
    findCommentById: jest.fn().mockResolvedValue(comment),
    createReply: jest.fn().mockResolvedValue({ id: 9 }),
    findReplyWithUser: jest.fn().mockResolvedValue({
      id: 9,
      reply: 'Merci',
      user: { id: 8, firstName: 'Awa', lastName: 'Diop', photo: null },
    }),
    deleteRepliesByCommentId: jest.fn(),
    deleteComment: jest.fn(),
    findReplyWithCommentAndProduct: jest.fn(),
    deleteReply: jest.fn(),
    updateComment: jest.fn().mockResolvedValue({
      ...comment,
      comment: 'Mis à jour',
    }),
    ...overrides,
  } as unknown as CommentRepository;
}

function notifications(): NotificationServicePort {
  return { create: jest.fn() };
}

describe('AddCommentUseCase', () => {
  it('refuse un produit non publié', async () => {
    const useCase = new AddCommentUseCase(
      commentsRepo({ findPublishedProduct: jest.fn().mockResolvedValue(null) }),
      notifications(),
    );

    await expect(useCase.execute(8, 20, 'Hello')).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Produit non trouvé ou non publié' },
    });
  });

  it('ajoute un commentaire et notifie le propriétaire', async () => {
    const comments = commentsRepo();
    const notify = notifications();
    const result = await new AddCommentUseCase(comments, notify).execute(
      8,
      20,
      'Bon produit',
    );

    expect(result.message).toBe('Commentaire ajouté avec succès');
    expect(comments.createComment).toHaveBeenCalledWith({
      productId: 20,
      userId: 8,
      comment: 'Bon produit',
    });
    expect(comments.incrementCommentsCount).toHaveBeenCalledWith(20);
    expect(notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2,
        type: 'PRODUCT',
      }),
    );
  });

  it('ne notifie pas si l’auteur commente son propre produit', async () => {
    const notify = notifications();
    await new AddCommentUseCase(commentsRepo(), notify).execute(
      2,
      20,
      'Note perso',
    );

    expect(notify.create).not.toHaveBeenCalled();
  });
});

describe('GetProductCommentsUseCase', () => {
  it('renvoie 404 si le produit n’existe pas', async () => {
    const useCase = new GetProductCommentsUseCase(
      commentsRepo({ findProductById: jest.fn().mockResolvedValue(null) }),
    );

    await expect(useCase.execute(99)).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Produit non trouvé' },
    });
  });
});

describe('ReplyToCommentUseCase', () => {
  it('renvoie 404 si le commentaire n’existe pas', async () => {
    const useCase = new ReplyToCommentUseCase(
      commentsRepo({
        findCommentWithProduct: jest.fn().mockResolvedValue(null),
      }),
      notifications(),
    );

    await expect(useCase.execute(8, 5, 'Merci')).rejects.toMatchObject({
      statusCode: 404,
      body: { message: 'Commentaire non trouvé' },
    });
  });
});

describe('DeleteCommentUseCase', () => {
  it('refuse la suppression si l’utilisateur n’est ni l’auteur ni le propriétaire', async () => {
    const useCase = new DeleteCommentUseCase(commentsRepo());

    await expect(useCase.execute(99, 5)).rejects.toMatchObject({
      statusCode: 403,
      body: { message: "Vous n'êtes pas autorisé à supprimer ce commentaire" },
    });
  });

  it('supprime le commentaire et les réponses', async () => {
    const comments = commentsRepo();
    const result = await new DeleteCommentUseCase(comments).execute(8, 5);

    expect(result).toEqual({ message: 'Commentaire supprimé avec succès' });
    expect(comments.deleteRepliesByCommentId).toHaveBeenCalledWith(5);
    expect(comments.deleteComment).toHaveBeenCalledWith(5);
    expect(comments.decrementCommentsCount).toHaveBeenCalledWith(20);
  });
});

describe('UpdateCommentUseCase', () => {
  it('refuse la modification si l’utilisateur n’est pas l’auteur', async () => {
    const useCase = new UpdateCommentUseCase(commentsRepo());

    await expect(useCase.execute(99, 5, 'Hack')).rejects.toMatchObject({
      statusCode: 403,
      body: { message: "Vous n'êtes pas autorisé à modifier ce commentaire" },
    });
  });
});
