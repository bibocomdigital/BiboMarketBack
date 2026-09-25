import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { NODE_ENV } from '@application/config/env';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  ADMIN_REPOSITORY,
  type AdminRepository,
} from '@domain/repositories/admin.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '@application/ports/output/password-hasher.port';
import {
  SMS_SERVICE,
  type SmsServicePort,
} from '@application/ports/output/sms-service.port';
import { isDesignatedSuperAdminPhone, isSuperAdminRole, Role } from '@domain/types/role';

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
    actorRole?: string,
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
      const touchesStaff =
        input.role === Role.SUPER_ADMIN ||
        input.role === Role.MODERATOR ||
        existing.role === Role.SUPER_ADMIN;
      if (touchesStaff && !isSuperAdminRole(actorRole)) {
        throw ExpressContractException.raw(403, {
          message:
            'Seul le super administrateur peut attribuer ou modifier ce rôle',
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

  async execute(id: number, actorId: number, actorRole?: string) {
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
    if (existing.role === Role.SUPER_ADMIN && !isSuperAdminRole(actorRole)) {
      throw ExpressContractException.raw(403, {
        message: 'Seul le super administrateur peut supprimer ce compte',
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

const CREATABLE_ROLES = new Set<Role>([
  Role.CLIENT,
  Role.MERCHANT,
  Role.SUPPLIER,
  Role.ADMIN,
  Role.MODERATOR,
]);

const ROLE_SMS_LABEL: Record<string, string> = {
  CLIENT: 'client',
  MERCHANT: 'commerçant',
  SUPPLIER: 'fournisseur',
  ADMIN: 'administrateur',
  MODERATOR: 'modérateur',
  SUPER_ADMIN: 'super administrateur',
};

function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let value = '';
  for (let index = 0; index < 10; index += 1) {
    value += alphabet[randomInt(alphabet.length)];
  }
  return value;
}

@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
    @Inject(SMS_SERVICE) private readonly sms: SmsServicePort,
  ) {}

  async execute(input: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    role?: string;
  }) {
    const firstName = input.firstName?.trim() ?? '';
    const lastName = input.lastName?.trim() ?? '';
    const phoneNumber = (input.phoneNumber ?? '').replace(/\s/g, '');
    const email = input.email?.trim() || null;
    if (firstName.length < 2 || lastName.length < 2) {
      throw ExpressContractException.raw(400, {
        message: 'Le prénom et le nom sont requis',
      });
    }
    if (!/^\+?[0-9]{9,15}$/.test(phoneNumber)) {
      throw ExpressContractException.raw(400, {
        message: 'Numéro de téléphone invalide',
      });
    }
    const storedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const requested = (input.role ?? Role.CLIENT) as Role;
    if (!CREATABLE_ROLES.has(requested) && !isDesignatedSuperAdminPhone(storedPhone)) {
      throw ExpressContractException.raw(400, {
        message: 'Rôle invalide',
      });
    }
    const role = isDesignatedSuperAdminPhone(storedPhone) ? Role.SUPER_ADMIN : requested;
    if (await this.users.findByPhoneNumber(storedPhone)) {
      throw ExpressContractException.raw(409, {
        message: 'Ce numéro est déjà utilisé',
      });
    }
    if (email && (await this.users.findByEmail(email))) {
      throw ExpressContractException.raw(409, {
        message: 'Cet email est déjà utilisé',
      });
    }

    const password = temporaryPassword();
    const created = await this.users.create({
      firstName,
      lastName,
      phoneNumber: storedPhone,
      email,
      password: await this.passwordHasher.hash(password),
      role,
      isVerified: true,
      phoneVerified: true,
      isProfileCompleted: true,
      profileCompletion: 100,
      onboardingStep: 'completed',
      country: 'Sénégal',
    });

    const message =
      `Bibocom Market : votre compte ${ROLE_SMS_LABEL[role] ?? role} est créé. ` +
      `Connexion avec ${storedPhone}. Mot de passe : ${password}`;
    try {
      await this.sms.sendRaw(storedPhone, message);
    } catch (error) {
      if (NODE_ENV === 'production') {
        await this.users.delete(created.id);
        throw ExpressContractException.raw(502, {
          message: "Le compte n'a pas été créé : l'envoi du SMS a échoué",
          error: errorMessage(error),
        });
      }
      return {
        message: "Compte créé. Le SMS n'a pas abouti, voici le mot de passe de test.",
        user: { id: created.id, phoneNumber: storedPhone, role, firstName, lastName },
        smsSent: false,
        temporaryPassword: password,
      };
    }

    return {
      message: `Identifiants envoyés par SMS au ${storedPhone}`,
      user: { id: created.id, phoneNumber: storedPhone, role, firstName, lastName },
      smsSent: true,
      ...(NODE_ENV === 'production' ? {} : { temporaryPassword: password }),
    };
  }
}

export { pagination };
