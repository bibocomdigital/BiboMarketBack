import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  ADMIN_REPOSITORY,
  type AdminRepository,
} from '@domain/repositories/admin.repository';
import { parseAdminPage, pagination } from './admin-users.use-case';

const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED'] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class ListAdminProductsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(query: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    shopId?: string;
    lowStock?: string;
    lowStockThreshold?: string;
  }) {
    try {
      const { page, limit } = parseAdminPage(query.page, query.limit);
      if (query.status && !PRODUCT_STATUSES.includes(query.status as never)) {
        throw ExpressContractException.raw(400, {
          message: 'Statut produit invalide',
          allowed: PRODUCT_STATUSES,
        });
      }
      const shopId = query.shopId ? parseInt(query.shopId, 10) : undefined;
      const { products, total } = await this.admin.findProducts({
        page,
        limit,
        search: query.search?.trim() || undefined,
        status: query.status,
        shopId: Number.isFinite(shopId) ? shopId : undefined,
        lowStock: query.lowStock === 'true' || query.lowStock === '1',
        lowStockThreshold: query.lowStockThreshold
          ? parseInt(query.lowStockThreshold, 10) || 10
          : 10,
      });
      return { products, pagination: pagination(total, page, limit) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors de la récupération des produits',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetAdminProductUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(id: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const product = await this.admin.findProductById(id);
    if (!product) {
      throw ExpressContractException.raw(404, {
        message: 'Produit non trouvé',
      });
    }
    return { product };
  }
}

@Injectable()
export class UpdateAdminProductUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(
    id: number,
    input: { status?: string; stock?: number | string },
  ) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const existing = await this.admin.findProductById(id);
    if (!existing) {
      throw ExpressContractException.raw(404, {
        message: 'Produit non trouvé',
      });
    }

    const data: Record<string, unknown> = {};
    if (input.status !== undefined) {
      if (!PRODUCT_STATUSES.includes(input.status as never)) {
        throw ExpressContractException.raw(400, {
          message: 'Statut produit invalide',
          allowed: PRODUCT_STATUSES,
        });
      }
      data.status = input.status;
    }
    if (input.stock !== undefined) {
      const stock = parseInt(String(input.stock), 10);
      if (Number.isNaN(stock) || stock < 0) {
        throw ExpressContractException.raw(400, {
          message: 'Le stock doit être un entier >= 0',
        });
      }
      data.stock = stock;
    }
    if (Object.keys(data).length === 0) {
      throw ExpressContractException.raw(400, {
        message: 'Aucun champ à mettre à jour (status, stock)',
      });
    }

    const product = await this.admin.updateProduct(id, data);
    return { message: 'Produit mis à jour', product };
  }
}

@Injectable()
export class DeleteAdminProductUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(id: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const existing = await this.admin.findProductById(id);
    if (!existing) {
      throw ExpressContractException.raw(404, {
        message: 'Produit non trouvé',
      });
    }
    const orderItems = await this.admin.countProductOrderItems(id);
    if (orderItems > 0) {
      throw ExpressContractException.raw(409, {
        message:
          'Impossible de supprimer un produit lié à des commandes. Passez-le en DRAFT.',
        orderItems,
      });
    }
    await this.admin.deleteProductCascade(id);
    return { message: 'Produit supprimé', productId: id };
  }
}
