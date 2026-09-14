import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type {
  MerchantContact,
  Shop,
  ShopProductFilter,
  ShopWriteInput,
} from '@domain/entities/shop.entity';
import type { ShopRepository } from '@domain/repositories/shop.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaShopRepository implements ShopRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: number): Promise<Shop | null> {
    return this.prisma.shop.findUnique({
      where: { userId },
    }) as Promise<Shop | null>;
  }

  findById(id: number): Promise<Shop | null> {
    return this.prisma.shop.findUnique({
      where: { id },
    }) as Promise<Shop | null>;
  }

  findByIdWithOwner(id: number) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            photo: true,
            createdAt: true,
          },
        },
      },
    });
  }

  findAllWithOwnerPreview() {
    return this.prisma.shop.findMany({
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
      },
    });
  }

  create(data: ShopWriteInput): Promise<Shop> {
    return this.prisma.shop.create({
      data: data as Prisma.ShopUncheckedCreateInput,
    }) as Promise<Shop>;
  }

  update(id: number, data: ShopWriteInput): Promise<Shop> {
    return this.prisma.shop.update({
      where: { id },
      data: data as Prisma.ShopUncheckedUpdateInput,
    }) as Promise<Shop>;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.shop.delete({ where: { id } });
  }

  findProductsByShopId(
    shopId: number,
    options?: { take?: number; orderByCreatedAt?: boolean },
  ) {
    return this.prisma.product.findMany({
      where: { shopId },
      include: { images: true },
      ...(options?.orderByCreatedAt
        ? { orderBy: { createdAt: 'desc' as const } }
        : {}),
      ...(options?.take ? { take: options.take } : {}),
    });
  }

  countProducts(shopId: number): Promise<number> {
    return this.prisma.product.count({ where: { shopId } });
  }

  async findFilteredProducts(filter: ShopProductFilter) {
    const whereClause: Prisma.ProductWhereInput = { shopId: filter.shopId };

    if (filter.categoryId) {
      whereClause.categorieProdId = filter.categoryId;
    }

    if (filter.searchTerm) {
      whereClause.OR = [
        { name: { contains: filter.searchTerm, mode: 'insensitive' } },
        { description: { contains: filter.searchTerm, mode: 'insensitive' } },
      ];
    }

    if (typeof filter.minPrice === 'number' && !Number.isNaN(filter.minPrice)) {
      whereClause.price = { gte: filter.minPrice };
    }

    if (typeof filter.maxPrice === 'number' && !Number.isNaN(filter.maxPrice)) {
      whereClause.price = {
        ...(typeof whereClause.price === 'object' ? whereClause.price : {}),
        lte: filter.maxPrice,
      };
    }

    if (filter.status) {
      whereClause.status = filter.status as Prisma.ProductWhereInput['status'];
    }

    const total = await this.prisma.product.count({ where: whereClause });
    const skip = (filter.page - 1) * filter.limit;

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        images: true,
        categorieProd: {
          select: {
            id: true,
            name: true,
            shopCategory: { select: { id: true, name: true } },
          },
        },
      },
      skip,
      take: filter.limit,
      orderBy: filter.sortBy
        ? ({ [filter.sortBy]: filter.order } as Prisma.ProductOrderByWithRelationInput)
        : { createdAt: 'desc' },
    });

    return { products, total };
  }

  findProductsWithImages(shopId: number) {
    return this.prisma.product.findMany({
      where: { shopId },
      include: { images: true },
    });
  }

  async deleteProductImagesByShopId(shopId: number): Promise<void> {
    await this.prisma.productImage.deleteMany({
      where: { product: { shopId } },
    });
  }

  async deleteProductsByShopId(shopId: number): Promise<void> {
    await this.prisma.product.deleteMany({ where: { shopId } });
  }

  createContact(data: {
    shopId: number;
    merchantId: number;
    subject: string;
    senderEmail: string;
    message: string;
    status: string;
  }): Promise<MerchantContact> {
    return this.prisma.merchantContact.create({
      data,
    }) as Promise<MerchantContact>;
  }

  findContactById(id: number) {
    return this.prisma.merchantContact.findUnique({
      where: { id },
      include: {
        shop: {
          include: { owner: true },
        },
      },
    });
  }

  createContactResponse(data: {
    merchantContactId: number;
    merchantId: number;
    response: string;
  }) {
    return this.prisma.merchantContactResponse.create({ data });
  }

  async markContactResponded(id: number): Promise<void> {
    await this.prisma.merchantContact.update({
      where: { id },
      data: { status: 'RESPONDED' },
    });
  }

  findContactsForUser(userId: number, email?: string | null) {
    return this.prisma.merchantContact.findMany({
      where: {
        OR: [
          email ? { senderEmail: email } : undefined,
          { merchantId: userId },
          { shop: { userId } },
        ].filter(Boolean) as Prisma.MerchantContactWhereInput[],
      },
      include: {
        shop: { select: { name: true } },
        responses: true,
        merchant: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
