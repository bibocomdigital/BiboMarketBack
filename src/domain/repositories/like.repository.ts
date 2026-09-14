export const LIKE_REPOSITORY = Symbol('LIKE_REPOSITORY');

export interface LikeRepository {
  findPublishedProduct(id: number): Promise<any>;
  findProductById(id: number): Promise<any>;
  findReaction(
    productId: number,
    userId: number,
    type?: string,
  ): Promise<any>;
  deleteReaction(id: number): Promise<void>;
  createReaction(data: {
    productId: number;
    userId: number;
    type: string;
  }): Promise<void>;
  incrementLikesCount(productId: number, by?: number): Promise<void>;
  decrementLikesCount(productId: number): Promise<void>;
  countByType(productId: number, type: string): Promise<number>;
  findUserNames(userId: number): Promise<{ firstName: string | null; lastName: string | null } | null>;
  findReactionsPaged(
    productId: number,
    type: string,
    page: number,
    limit: number,
  ): Promise<{ likes: any[]; total: number }>;
}
