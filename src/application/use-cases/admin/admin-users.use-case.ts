import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  ADMIN_REPOSITORY,
  type AdminRepository,
} from '@domain/repositories/admin.repository';
import { Role } from '@domain/types/role';

const ADMIN_ROLES = Object.values(Role);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function parseAdminPage(page?: string, limit?: string) {
  const parsedPage = Math.max(1, parseInt(page ?? '1', 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
  return { page: parsedPage, limit: parsedLimit };
}

function pagination(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

@Injectable()
export class ListAdminUsersUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(query: { page?: string; limit?: string; role?: string; search?: string }) {
    try {
      const { page, limit } = parseAdminPage(query.page, query.limit);
      if (query.role && !ADMIN_ROLES.includes(query.role as Role)) {
        throw ExpressContractException.raw(400, {
          message: 'Rôle invalide',
          allowed: ADMIN_ROLES,
        });
      }
      const { users, total } = await this.admin.findUsers({
        page,
        limit,
        role: query.role,
        search: query.search?.trim() || undefined,
      });
      return { users, pagination: pagination(total, page, limit) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors de la récupération des utilisateurs',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetAdminUserUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(id: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const user = await this.admin.findUserById(id);
    if (!user) {
      throw ExpressContractException.raw(404, {
        message: 'Utilisateur non trouvé',
      });
    }
    return { user };
  }
}

@Injectable()
export class UpdateAdminUserUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(
    id: number,
    input: { role?: string; isVerified?: boolean },
  ) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    const existing = await this.admin.findUserById(id);
    if (!existing) {
      throw ExpressContractException.raw(404, {
        message: 'Utilisateur non trouvé',
      });
    }

    const data: Record<string, unknown> = {};
    if (input.role !== undefined) {
      if (!ADMIN_ROLES.includes(input.role as Role)) {
        throw ExpressContractException.raw(400, {
          message: 'Rôle invalide',
          allowed: ADMIN_ROLES,
        });
      }
      data.role = input.role;
    }
    if (input.isVerified !== undefined) {
      data.isVerified = input.isVerified;
    }
    if (Object.keys(data).length === 0) {
      throw ExpressContractException.raw(400, {
        message: 'Aucun champ à mettre à jour (role, isVerified)',
      });
    }

    const user = await this.admin.updateUser(id, data);
    return { message: 'Utilisateur mis à jour', user };
  }
}

@Injectable()
export class DeleteAdminUserUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly admin: AdminRepository,
  ) {}

  async execute(id: number, actorId: number) {
    if (!Number.isFinite(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }
    if (id === actorId) {
      throw ExpressContractException.raw(400, {
        message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }
    const existing = await this.admin.findUserById(id);
    if (!existing) {
      throw ExpressContractException.raw(404, {
        message: 'Utilisateur non trouvé',
      });
    }
    const deps = await this.admin.countUserDependencies(id);
    if (deps.shop > 0 || deps.orders > 0 || deps.products > 0) {
      throw ExpressContractException.raw(409, {
        message:
          'Impossible de supprimer cet utilisateur : boutique, commandes ou produits liés. Désactivez la boutique ou changez le rôle.',
        dependencies: deps,
      });
    }
    await this.admin.deleteUser(id);
    return { message: 'Utilisateur supprimé', userId: id };
  }
}

export { pagination };
