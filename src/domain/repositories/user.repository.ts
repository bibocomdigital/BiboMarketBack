import type { User, UserWriteInput } from '@domain/entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findFirstByPhoneOrEmail(params: {
    phoneNumber?: string;
    phone?: string;
    email?: string;
  }): Promise<User | null>;
  findByPhoneNumberExcludingId(
    phoneNumber: string,
    userId: number,
  ): Promise<User | null>;
  create(data: UserWriteInput): Promise<User>;
  update(id: number, data: UserWriteInput): Promise<User>;
  updateByEmail(email: string, data: UserWriteInput): Promise<User>;
  delete(id: number): Promise<void>;
  findAll(): Promise<User[]>;
  findAllOrderedByCreatedAt(): Promise<User[]>;
}
