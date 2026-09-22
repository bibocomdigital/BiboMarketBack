import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type {
  Product,
  ProductListFilter,
  ProductWriteInput,
} from '@domain/entities/product.entity';
import type { ProductRepository } from '@domain/repositories/product.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const shopPreview = {
  select: {
    id: true,
    name: true,
    logo: true,
    verifiedBadge: true,
  },
} as const;

const shopListSelect = {
  select: {
    id: true,
    name: true,
    logo: true,
    verifiedBadge: true,
  },
} as const;

const categorySelect = {
  select: {
    id: true,
    name: true,
    shopCategory: {
      select: { id: true, name: true },
    },
  },
} as const;

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: ProductWriteInput): Promise<Product> {
    return this.prisma.product.create({
      data: data as Prisma.ProductUncheckedCreateInput,
    }) as Promise<Product>;
  }

  update(id: number, data: ProductWriteInput): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: data as Prisma.ProductUncheckedUpdateInput,
    }) as Promise<Product>;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  findById(id: number): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
    }) as Promise<Product | null>;
  }

  findByIdWithImages(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });
  }

  findCreatedView(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        shop: { select: { id: true, name: true } },
        categorieProd: categorySelect,
      },
    });
  }

  findUpdatedView(id: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        shop: { select: { name: true, id: true } },
      },
    });
  }

  findDetailById(id: number, userId?: number) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
            verifiedBadge: true,
            phoneNumber: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
              },
            },
          },
        },
        categorieProd: categorySelect,
        likes: userId
          ? {
              where: { userId, type: 'LIKE' },
              select: { id: true, type: true },
            }
          : false,
      },
    });
  }

  async findListed(filter: ProductListFilter, userId?: number) {
    const where = this.listWhere(filter);
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: filter.sortBy
          ? ({ [filter.sortBy]: filter.order } as Prisma.ProductOrderByWithRelationInput)
          : { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: {
          images: true,
          shop: shopListSelect,
          categorieProd: categorySelect,
          likes: userId
            ? {
                where: { userId, type: 'LIKE' },
                select: { id: true, type: true },
              }
            : false,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total };
  }

  async searchListed(filter: ProductListFilter, userId?: number) {
    const where = this.searchWhere(filter);
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: {
          images: true,
          shop: shopPreview,
          categorieProd: categorySelect,
          likes: userId
            ? {
                where: { userId, type: 'LIKE' },
                select: { id: true, type: true },
              }
            : false,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total };
  }

  async findByUserIdPaged(userId: number, page: number, limit: number) {
    const where = { userId };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: true,
          shop: {
            select: { name: true, logo: true, verifiedBadge: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total };
  }

  async findByCategoryPaged(categoryId: number, page: number, limit: number) {
    const where = { categorieProdId: categoryId };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: true,
          shop: {
            select: { name: true, logo: true, verifiedBadge: true },
          },
          categorieProd: categorySelect,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total };
  }

  findLatest(limit: number) {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        images: true,
        shop: {
          select: { name: true, logo: true, verifiedBadge: true },
        },
      },
    });
  }

  findFeatured(limit: number) {
    return this.prisma.product.findMany({
      orderBy: { stock: 'desc' },
      take: limit,
      include: {
        images: true,
        shop: {
          select: { name: true, logo: true, verifiedBadge: true },
        },
      },
    });
  }

  findRelated(productId: number, categoryId: number, limit: number) {
    return this.prisma.product.findMany({
      where: {
        categorieProdId: categoryId,
        id: { not: productId },
      },
      take: limit,
      include: {
        images: true,
        shop: {
          select: { name: true, logo: true, verifiedBadge: true },
        },
        categorieProd: categorySelect,
      },
    });
  }

  findCategorieProdById(id: number) {
    return this.prisma.categorieProd.findUnique({
      where: { id },
      include: { shopCategory: true },
    });
  }

  findAllCategories() {
    return this.prisma.categorieProd.findMany({
      include: {
        shopCategory: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createImages(
    data: { productId: number; imageUrl: string }[],
  ): Promise<void> {
    if (data.length === 0) {
      return;
    }
    await this.prisma.productImage.createMany({ data });
  }

  async deleteImagesByProductId(productId: number): Promise<void> {
    await this.prisma.productImage.deleteMany({ where: { productId } });
  }

  async deleteImagesByUrls(productId: number, urls: string[]): Promise<number> {
    const result = await this.prisma.productImage.deleteMany({
      where: { productId, imageUrl: { in: urls } },
    });
    return result.count;
  }

  countByUserId(userId: number): Promise<number> {
    return this.prisma.product.count({ where: { userId } });
  }

  countLowStock(userId: number): Promise<number> {
    return this.prisma.product.count({
      where: { userId, stock: { lt: 10 } },
    });
  }

  async groupCountByCategory(userId: number) {
    const groups = await this.prisma.product.groupBy({
      by: ['categorieProdId'],
      where: { userId },
      _count: { id: true },
    });

    const categories = await this.prisma.categorieProd.findMany({
      where: { id: { in: groups.map((group) => group.categorieProdId) } },
      select: { id: true, name: true },
    });
    const names = new Map(categories.map((item) => [item.id, item.name]));

    return groups.map((group) => ({
      categorieProdId: group.categorieProdId,
      count: group._count.id,
      categorieProd: names.has(group.categorieProdId)
        ? { name: names.get(group.categorieProdId) as string }
        : null,
    }));
  }

  async findFollowerIds(userId: number): Promise<number[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    return rows.map((row) => row.followerId);
  }

  private listWhere(filter: ProductListFilter): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    if (filter.status) {
      where.status = filter.status as Prisma.ProductWhereInput['status'];
    }
    if (filter.categoryId) {
      where.categorieProdId = filter.categoryId;
    }
    if (
      typeof filter.minPrice === 'number' ||
      typeof filter.maxPrice === 'number'
    ) {
      where.price = {};
      if (typeof filter.minPrice === 'number' && !Number.isNaN(filter.minPrice)) {
        where.price.gte = filter.minPrice;
      }
      if (typeof filter.maxPrice === 'number' && !Number.isNaN(filter.maxPrice)) {
        where.price.lte = filter.maxPrice;
      }
    }
    const term = filter.search?.trim();
    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private searchWhere(filter: ProductListFilter): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
      OR: [
        { name: { contains: filter.search ?? '', mode: 'insensitive' } },
        { description: { contains: filter.search ?? '', mode: 'insensitive' } },
      ],
    };
    if (filter.categoryId) {
      where.categorieProdId = filter.categoryId;
    }
    if (
      typeof filter.minPrice === 'number' ||
      typeof filter.maxPrice === 'number'
    ) {
      where.price = {};
      if (typeof filter.minPrice === 'number' && !Number.isNaN(filter.minPrice)) {
        where.price.gte = filter.minPrice;
      }
      if (typeof filter.maxPrice === 'number' && !Number.isNaN(filter.maxPrice)) {
        where.price.lte = filter.maxPrice;
      }
    }
    return where;
  }
}
