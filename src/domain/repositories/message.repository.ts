export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

export interface MessageWriteInput {
  senderId: number;
  receiverId: number;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  isRead: boolean;
}

export interface MessageRepository {
  findUserById(id: number): Promise<any>;
  findPartnerPreview(id: number): Promise<any>;
  create(data: MessageWriteInput): Promise<any>;
  findConversationMessages(userId: number): Promise<any[]>;
  findThreadMessages(userId: number, partnerId: number): Promise<any[]>;
  markReadByIds(ids: number[]): Promise<void>;
  findById(id: number): Promise<any>;
  updateContent(id: number, content: string): Promise<any>;
  transformDeletedForEveryone(id: number): Promise<void>;
  markDeletedForSender(id: number): Promise<void>;
  markDeletedForReceiver(id: number): Promise<void>;
  markAsRead(id: number): Promise<any>;
  markAllFromPartnerAsRead(
    userId: number,
    partnerId: number,
  ): Promise<number>;
  findUnreadForUser(userId: number): Promise<any[]>;
  search(userId: number, query: string): Promise<any[]>;
}
