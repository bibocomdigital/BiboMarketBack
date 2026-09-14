import { Inject, Injectable } from '@nestjs/common';
import type { User } from '@domain/entities/user.entity';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '@application/ports/output/password-hasher.port';
import {
  EMAIL_SERVICE,
  type EmailServicePort,
} from '@application/ports/output/email-service.port';

const PUBLIC_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'role',
  'phoneNumber',
  'country',
  'city',
  'department',
  'commune',
  'photo',
  'createdAt',
  'updatedAt',
] as const;

function publicUser(user: User) {
  return Object.fromEntries(
    PUBLIC_FIELDS.map((field) => [field, user[field]]),
  );
}

function withoutPassword(user: User) {
  const { password: _password, ...rest } = user;
  return rest;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute() {
    try {
      const users = await this.users.findAll();
      return { status: 'success', data: users.map(publicUser) };
    } catch (error) {
      throw ExpressContractException.raw(500, {
        status: 'error',
        message: 'Erreur serveur',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(id: number) {
    if (Number.isNaN(id)) {
      throw ExpressContractException.raw(400, { message: 'ID invalide' });
    }

    try {
      const user = await this.users.findById(id);
      if (!user) {
        throw ExpressContractException.raw(404, {
          message: 'Utilisateur non trouvé',
        });
      }
      return { status: 'success', user: publicUser(user) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        status: 'error',
        message: 'Erreur serveur',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailServicePort,
  ) {}

  async execute(input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: string;
  }) {
    try {
      const hashedPassword = await this.passwordHasher.hash(
        input.password as string,
      );
      const user = await this.users.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        password: hashedPassword,
        role: input.role,
      });

      await this.emailService.sendWelcome(
        user.email as string,
        user.firstName as string,
      );

      return {
        message: 'Utilisateur créé',
        user: withoutPassword(user),
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: "Erreur lors de la création de l'utilisateur",
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class UpdateUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(
    id: number,
    input: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      country?: string;
      city?: string;
      department?: string;
      commune?: string;
      role?: string;
      password?: string;
    },
  ) {
    try {
      const user = await this.users.findById(id);
      if (!user) {
        throw ExpressContractException.raw(404, {
          message: 'Utilisateur non trouvé',
        });
      }

      const updateData: Record<string, unknown> = {
        firstName: input.firstName || user.firstName,
        lastName: input.lastName || user.lastName,
        phoneNumber: input.phoneNumber || user.phoneNumber,
        country: input.country || user.country,
        city: input.city || user.city,
        department: input.department || user.department,
        commune: input.commune || user.commune,
        role: input.role || user.role,
      };

      if (input.password) {
        updateData.password = await this.passwordHasher.hash(input.password);
      }

      const updatedUser = await this.users.update(id, updateData);
      return {
        message: 'Utilisateur mis à jour',
        user: withoutPassword(updatedUser),
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur serveur',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class DeleteUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(id: number) {
    try {
      await this.users.delete(id);
      return { message: 'Utilisateur supprimé avec succès' };
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Erreur serveur',
        error: errorMessage(error),
      });
    }
  }
}

@Injectable()
export class GetConnectedProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: number) {
    try {
      const user = await this.users.findById(userId);
      if (!user) {
        throw ExpressContractException.raw(404, {
          message: 'Utilisateur non trouvé',
        });
      }
      return { user: withoutPassword(user) };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors de la récupération du profil',
      });
    }
  }
}

@Injectable()
export class UpdateConnectedProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(
    userId: number,
    input: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      password?: string;
      country?: string;
      city?: string;
      department?: string;
      commune?: string;
      role?: string;
    },
  ) {
    try {
      const user = await this.users.findById(userId);
      if (!user) {
        throw ExpressContractException.raw(404, {
          message: 'Utilisateur non trouvé',
        });
      }

      const updateData: Record<string, unknown> = {
        firstName: input.firstName || user.firstName,
        lastName: input.lastName || user.lastName,
        phoneNumber: input.phoneNumber || user.phoneNumber,
        country: input.country || user.country,
        city: input.city || user.city,
        department: input.department || user.department,
        commune: input.commune || user.commune,
        role: input.role || user.role,
      };

      if (input.password) {
        updateData.password = await this.passwordHasher.hash(input.password);
      }

      const updatedUser = await this.users.update(userId, updateData);
      return {
        message: 'Profil mis à jour avec succès',
        user: withoutPassword(updatedUser),
      };
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }
      throw ExpressContractException.raw(500, {
        message: 'Erreur lors de la mise à jour du profil',
      });
    }
  }
}

@Injectable()
export class UploadUserProfilePhotoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: number, photoPath?: string) {
    if (!photoPath) {
      throw ExpressContractException.raw(400, {
        message: 'Aucune photo fournie',
      });
    }

    try {
      const updatedUser = await this.users.update(userId, { photo: photoPath });
      return {
        message: 'Photo de profil mise à jour',
        photoUrl: updatedUser.photo,
      };
    } catch (error) {
      throw ExpressContractException.raw(500, {
        message: 'Erreur serveur',
        error: errorMessage(error),
      });
    }
  }
}
