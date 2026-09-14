import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { User, UserWriteInput } from '@domain/entities/user.entity';
import type { UserRepository } from '@domain/repositories/user.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
    }) as Promise<User | null>;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    }) as Promise<User | null>;
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
    }) as Promise<User | null>;
  }

  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    }) as Promise<User | null>;
  }

  findFirstByPhoneOrEmail(params: {
    phoneNumber?: string;
    phone?: string;
    email?: string;
  }): Promise<User | null> {
    const phone = params.phoneNumber ?? params.phone;

    return this.prisma.user.findFirst({
      where: {
        OR: [
          phone ? { phoneNumber: phone } : undefined,
          params.email ? { email: params.email } : undefined,
        ].filter(Boolean) as Prisma.UserWhereInput[],
      },
    }) as Promise<User | null>;
  }

  findByPhoneNumberExcludingId(
    phoneNumber: string,
    userId: number,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        phoneNumber,
        id: { not: userId },
      },
    }) as Promise<User | null>;
  }

  create(data: UserWriteInput): Promise<User> {
    return this.prisma.user.create({
      data: data as Prisma.UserUncheckedCreateInput,
    }) as Promise<User>;
  }

  update(id: number, data: UserWriteInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: data as Prisma.UserUncheckedUpdateInput,
    }) as Promise<User>;
  }

  updateByEmail(email: string, data: UserWriteInput): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data: data as Prisma.UserUncheckedUpdateInput,
    }) as Promise<User>;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany() as Promise<User[]>;
  }

  findAllOrderedByCreatedAt(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    }) as Promise<User[]>;
  }
}
