import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type {
  CategorieProd,
  CategorieProdWriteInput,
} from '@domain/entities/categorie-prod.entity';
import type { CategorieProdRepository } from '@domain/repositories/categorie-prod.repository';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaCategorieProdRepository implements CategorieProdRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CategorieProdWriteInput): Promise<CategorieProd> {
    return this.prisma.categorieProd.create({
      data: data as Prisma.CategorieProdUncheckedCreateInput,
    });
  }

  findAll(): Promise<CategorieProd[]> {
    return this.prisma.categorieProd.findMany();
  }

  findById(id: number): Promise<CategorieProd | null> {
    return this.prisma.categorieProd.findUnique({
      where: { id },
      include: { shopCategory: true },
    });
  }

  update(id: number, data: CategorieProdWriteInput): Promise<CategorieProd> {
    return this.prisma.categorieProd.update({
      where: { id },
      data: data as Prisma.CategorieProdUncheckedUpdateInput,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.categorieProd.delete({
      where: { id },
    });
  }
}
