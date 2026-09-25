import { Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import { chargedPrice } from '@domain/pricing/charged-price';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export type StockAdjustKind = 'RECEPTION' | 'COMPTOIR' | 'INVENTAIRE';

const movementSelect = {
  id: true,
  kind: true,
  quantity: true,
  delta: true,
  stockAfter: true,
  note: true,
  orderId: true,
  createdAt: true,
  product: { select: { id: true, name: true } },
} as const;

export async function recordInventoryCorrection(
  prisma: PrismaService,
  input: { productId: number; userId: number; previous: number; next: number; note: string },
) {
  if (input.previous === input.next) return;
  await prisma.stockMovement.create({
    data: {
      productId: input.productId,
      userId: input.userId,
      kind: 'INVENTAIRE',
      quantity: Math.abs(input.next - input.previous),
      delta: input.next - input.previous,
      stockAfter: input.next,
      note: input.note,
    },
  });
}

@Injectable()
export class StockMovementUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(
    userId: number,
    productId: number,
    kind: string,
    quantity: number | string | undefined,
    note?: string,
  ) {
    if (kind !== 'RECEPTION' && kind !== 'COMPTOIR' && kind !== 'INVENTAIRE') {
      throw ExpressContractException.raw(400, { message: 'Type de mouvement inconnu' });
    }
    const amount = parseInt(String(quantity), 10);
    if (!Number.isInteger(amount) || (kind === 'INVENTAIRE' ? amount < 0 : amount < 1) || amount > 100000) {
      throw ExpressContractException.raw(400, {
        message: kind === 'INVENTAIRE'
          ? 'Indiquez la quantité comptée, zéro ou plus'
          : 'Indiquez une quantité entière supérieure à zéro',
      });
    }
    const cleanNote = note?.trim().slice(0, 180) || null;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw ExpressContractException.raw(404, { message: 'Produit non trouvé' });
      }
      if (product.userId !== userId) {
        throw ExpressContractException.raw(403, {
          message: "Vous n'êtes pas autorisé à modifier ce produit",
        });
      }

      if (kind === 'COMPTOIR') {
        const reserved = await tx.product.updateMany({
          where: { id: productId, stock: { gte: amount } },
          data: { stock: { decrement: amount } },
        });
        if (reserved.count !== 1) {
          throw ExpressContractException.raw(400, {
            message: 'Stock insuffisant pour cette vente au comptoir',
          });
        }
      } else if (kind === 'RECEPTION') {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: amount } },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { stock: amount },
        });
      }

      const updated = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });
      const next = updated?.stock ?? product.stock;
      const delta = kind === 'INVENTAIRE' ? next - product.stock : kind === 'COMPTOIR' ? -amount : amount;
      if (delta === 0) {
        return { stock: next, movement: null, sale: null };
      }

      const sale = kind === 'COMPTOIR'
        ? await tx.counterSale.create({
            data: {
              productId,
              userId,
              quantity: amount,
              unitPrice: chargedPrice(product.price, product.promoPrice),
              total: chargedPrice(product.price, product.promoPrice) * amount,
              note: cleanNote,
            },
          })
        : null;

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          userId,
          kind,
          quantity: kind === 'INVENTAIRE' ? Math.abs(delta) : amount,
          delta,
          stockAfter: next,
          note: cleanNote,
          counterSaleId: sale?.id,
        },
        select: movementSelect,
      });

      return { stock: next, movement, sale };
    });
  }

  listMovements(userId: number) {
    return this.prisma.stockMovement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: movementSelect,
    });
  }

  async listCounterSales(userId: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [sales, today] = await Promise.all([
      this.prisma.counterSale.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 40,
        include: { product: { select: { id: true, name: true } } },
      }),
      this.prisma.counterSale.aggregate({
        where: { userId, createdAt: { gte: start } },
        _sum: { total: true, quantity: true },
        _count: true,
      }),
    ]);
    return {
      sales,
      today: {
        count: today._count,
        quantity: today._sum.quantity ?? 0,
        total: today._sum.total ?? 0,
      },
    };
  }
}
