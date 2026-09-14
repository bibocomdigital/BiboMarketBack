import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type {
  CategorieShop,
  CategorieShopWriteInput,
} from '@domain/entities/categorie-shop.entity';
import type { CategorieShopRepository } from '@domain/repositories/categorie-shop.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaCategorieShopRepository implements CategorieShopRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CategorieShopWriteInput): Promise<CategorieShop> {
    return this.prisma.categorieShop.create({
      data: data as Prisma.CategorieShopUncheckedCreateInput,
    });
  }

  findAll(): Promise<CategorieShop[]> {
    return this.prisma.categorieShop.findMany({
      include: { prodCategories: true },
    });
  }

  findById(id: number): Promise<CategorieShop | null> {
    return this.prisma.categorieShop.findUnique({
      where: { id },
      include: { prodCategories: true },
    });
  }

  update(id: number, data: CategorieShopWriteInput): Promise<CategorieShop> {
    return this.prisma.categorieShop.update({
      where: { id },
      data: data as Prisma.CategorieShopUncheckedUpdateInput,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.categorieShop.delete({
      where: { id },
    });
  }
}
