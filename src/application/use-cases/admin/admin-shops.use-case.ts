import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  ADMIN_REPOSITORY,
  type AdminRepository,
} from '@domain/repositories/admin.repository';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import { parseAdminPage, pagination } from './admin-users.use-case';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

@Injectable()
export class ListAdminShopsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(query: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    verified?: string;
  }) {
    try {
      const { page, limit } = parseAdminPage(query.page, query.limit);
      const { shops, total } = await this.admin.findShops({
        page,
        limit,
        search: query.search?.trim() || undefined,
        status: parseBoolean(query.status),
        verified: parseBoolean(query.verified),
      });
      return { shops, pagination: pagination(total, page, limit) };
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors de la récupération des boutiques',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetAdminShopUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(id: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const shop = await this.admin.findShopById(id);
    if (!shop) {
      throw ExpressContractException.raw(404, {
        message: 'Boutique non trouvée',
      });
    }
    return { shop };
  }
}

@Injectable()
export class UpdateAdminShopUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async execute(
    id: number,
    input: { status?: boolean | string; verifiedBadge?: boolean | string },
  ) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const shop = await this.admin.findShopById(id);
    if (!shop) {
      throw ExpressContractException.raw(404, {
        message: 'Boutique non trouvée',
      });
    }

    const data: Record<string, unknown> = {};
    const status = parseBoolean(input.status);
    const verifiedBadge = parseBoolean(input.verifiedBadge);
    if (status !== undefined) {
      data.status = status;
    }
    if (verifiedBadge !== undefined) {
      data.verifiedBadge = verifiedBadge;
    }
    if (Object.keys(data).length === 0) {
      throw ExpressContractException.raw(400, {
        message: 'Aucun champ à mettre à jour (status, verifiedBadge)',
      });
    }

    const updated = await this.admin.updateShop(id, data);

    if (verifiedBadge === true && shop.verifiedBadge === false) {
      await this.notifications.create({
        userId: shop.owner?.id ?? shop.userId,
        type: 'SHOP',
        message: `Votre boutique « ${shop.name} » a été vérifiée par l'administration.`,
        actionUrl: `/dashboard/shops/${shop.id}`,
        resourceId: shop.id,
        resourceType: 'Shop',
        priority: 1,
      });
    }
    if (status === false && shop.status === true) {
      await this.notifications.create({
        userId: shop.owner?.id ?? shop.userId,
        type: 'SHOP',
        message: `Votre boutique « ${shop.name} » a été désactivée par l'administration.`,
        actionUrl: `/dashboard/shops/${shop.id}`,
        resourceId: shop.id,
        resourceType: 'Shop',
        priority: 1,
      });
    }

    return { message: 'Boutique mise à jour', shop: updated };
  }
}

@Injectable()
export class DeleteAdminShopUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(id: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const shop = await this.admin.findShopById(id);
    if (!shop) {
      throw ExpressContractException.raw(404, {
        message: 'Boutique non trouvée',
      });
    }
    const orderItems = await this.admin.countShopOrderItems(id);
    if (orderItems > 0) {
      throw ExpressContractException.raw(409, {
        message:
          'Impossible de supprimer une boutique liée à des commandes. Désactivez-la plutôt.',
        orderItems,
      });
    }
    await this.admin.deleteShopCascade(id);
    return { message: 'Boutique supprimée', shopId: id };
  }
}

@Injectable()
export class ListAdminFeedbacksUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(query: { page?: string; limit?: string; search?: string }) {
    const { page, limit } = parseAdminPage(query.page, query.limit);
    const { feedbacks, total } = await this.admin.findFeedbacks({
      page,
      limit,
      search: query.search?.trim() || undefined,
    });
    return { feedbacks, pagination: pagination(total, page, limit) };
  }
}
