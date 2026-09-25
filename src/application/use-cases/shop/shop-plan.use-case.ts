import { Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export type ShopPlanInput = {
  name?: string;
  priceCfa?: number;
  durationDays?: number;
  maxProducts?: number;
  active?: boolean;
  sortOrder?: number;
};

function readInt(value: unknown, label: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw ExpressContractException.raw(400, {
      message: `${label} doit être un entier entre ${min} et ${max}`,
    });
  }
  return parsed;
}

@Injectable()
export class ShopPlanUseCase {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    return this.prisma.shopPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  listAll() {
    return this.prisma.shopPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async create(input: ShopPlanInput) {
    const name = input.name?.trim() ?? '';
    if (name.length < 2) {
      throw ExpressContractException.raw(400, { message: 'Le nom du plan est requis' });
    }
    return this.prisma.shopPlan.create({
      data: {
        name,
        priceCfa: readInt(input.priceCfa, 'Le prix', 0, 5_000_000),
        durationDays: readInt(input.durationDays, 'La durée', 1, 3650),
        maxProducts: readInt(input.maxProducts, 'Le nombre de produits', 1, 100_000),
        active: input.active !== false,
        sortOrder: input.sortOrder === undefined ? 0 : readInt(input.sortOrder, 'L’ordre', 0, 1000),
      },
    });
  }

  async update(id: number, input: ShopPlanInput) {
    const existing = await this.prisma.shopPlan.findUnique({ where: { id } });
    if (!existing) {
      throw ExpressContractException.raw(404, { message: 'Plan introuvable' });
    }
    const data: {
      name?: string;
      priceCfa?: number;
      durationDays?: number;
      maxProducts?: number;
      active?: boolean;
      sortOrder?: number;
    } = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 2) {
        throw ExpressContractException.raw(400, { message: 'Le nom du plan est requis' });
      }
      data.name = name;
    }
    if (input.priceCfa !== undefined) data.priceCfa = readInt(input.priceCfa, 'Le prix', 0, 5_000_000);
    if (input.durationDays !== undefined) {
      data.durationDays = readInt(input.durationDays, 'La durée', 1, 3650);
    }
    if (input.maxProducts !== undefined) {
      data.maxProducts = readInt(input.maxProducts, 'Le nombre de produits', 1, 100_000);
    }
    if (input.active !== undefined) data.active = Boolean(input.active);
    if (input.sortOrder !== undefined) data.sortOrder = readInt(input.sortOrder, 'L’ordre', 0, 1000);
    return this.prisma.shopPlan.update({ where: { id }, data });
  }

  async remove(id: number) {
    const existing = await this.prisma.shopPlan.findUnique({ where: { id } });
    if (!existing) {
      throw ExpressContractException.raw(404, { message: 'Plan introuvable' });
    }
    const used = await this.prisma.shop.count({ where: { planId: id } });
    if (used > 0) {
      return this.prisma.shopPlan.update({ where: { id }, data: { active: false } });
    }
    await this.prisma.shopPlan.delete({ where: { id } });
    return { id, removed: true };
  }
}
