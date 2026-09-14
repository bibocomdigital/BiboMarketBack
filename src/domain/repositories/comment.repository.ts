export const COMMENT_REPOSITORY = Symbol('COMMENT_REPOSITORY');

export interface CommentRepository {
  findPublishedProduct(id: number): Promise<any>;
  findProductById(id: number): Promise<any>;
  createComment(data: {
    productId: number;
    userId: number;
    comment: string;
  }): Promise<{ id: number }>;
  incrementCommentsCount(productId: number): Promise<void>;
  decrementCommentsCount(productId: number): Promise<void>;
  findCommentWithUser(id: number): Promise<any>;
  findCommentsPaged(
    productId: number,
    page: number,
    limit: number,
  ): Promise<{ comments: any[]; total: number }>;
  findCommentWithProduct(id: number): Promise<any>;
  findCommentById(id: number): Promise<any>;
  createReply(data: {
    commentId: number;
    userId: number;
    reply: string;
  }): Promise<{ id: number }>;
  findReplyWithUser(id: number): Promise<any>;
  deleteRepliesByCommentId(commentId: number): Promise<void>;
  deleteComment(id: number): Promise<void>;
  findReplyWithCommentAndProduct(id: number): Promise<any>;
  deleteReply(id: number): Promise<void>;
  updateComment(id: number, comment: string): Promise<any>;
}
