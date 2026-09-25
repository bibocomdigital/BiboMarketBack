import { Inject, Injectable } from '@nestjs/common';
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
  FILE_STORAGE,
  type FileStoragePort,
} from '@application/ports/output/file-storage.port';
import { NODE_ENV } from '@application/config/env';
import { isDesignatedSuperAdminPhone, Role } from '@domain/types/role';

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ExpressContractException(
        404,
        'Utilisateur non trouvé',
        'USER_NOT_FOUND',
      );
    }

    return {
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        googleId: user.googleId ?? null,
        country: user.country,
        city: user.city,
        department: user.department,
        commune: user.commune,
        photo: user.photo,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ExpressContractException(
        404,
        'Utilisateur non trouvé',
        'USER_NOT_FOUND',
      );
    }

    const passwordMatch = await this.passwordHasher.compare(
      currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new ExpressContractException(
        401,
        'Mot de passe actuel incorrect',
        'INCORRECT_PASSWORD',
      );
    }

    await this.users.update(userId, {
      password: await this.passwordHasher.hash(newPassword),
    });

    return {
      status: 'success',
      message: 'Mot de passe changé avec succès',
    };
  }
}

@Injectable()
export class DeleteUserAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ExpressContractException(
        404,
        'Utilisateur non trouvé',
        'USER_NOT_FOUND',
      );
    }

    if (user.photo && user.photo.includes('cloudinary.com')) {
      try {
        await this.fileStorage.deleteProfilePhoto(user.photo);
      } catch {
        // continuer malgré l'erreur, comme Express
      }
    }

    await this.users.delete(userId);

    return {
      status: 'success',
      message: 'Compte utilisateur supprimé avec succès',
    };
  }
}

@Injectable()
export class VerifyAuthTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ExpressContractException(
        404,
        'Utilisateur non trouvé',
        'USER_NOT_FOUND',
      );
    }

    return {
      status: 'success',
      message: 'Token valide',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phoneVerified: user.phoneVerified,
      },
    };
  }
}

@Injectable()
export class LogoutUserUseCase {
  execute() {
    return {
      status: 'success',
      message: 'Déconnexion réussie',
    };
  }
}

@Injectable()
export class GetAllUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(role?: string) {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ExpressContractException(
        403,
        'Accès réservé aux administrateurs',
        'UNAUTHORIZED',
      );
    }

    const users = await this.users.findAllOrderedByCreatedAt();

    return {
      status: 'success',
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        country: user.country,
        city: user.city,
        department: user.department,
        commune: user.commune,
        photo: user.photo,
        role: user.role,
        isVerified: user.isVerified,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    };
  }
}

@Injectable()
export class UpdateUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(adminRole: string | undefined, userId: number, role: string) {
    if (adminRole !== 'ADMIN' && adminRole !== 'SUPER_ADMIN') {
      throw new ExpressContractException(
        403,
        'Accès réservé aux administrateurs',
        'UNAUTHORIZED',
      );
    }

    const validRoles = ['USER', 'ADMIN', 'PROVIDER', 'COMPANY'];
    if (!validRoles.includes(role)) {
      throw new ExpressContractException(
        400,
        "Le rôle spécifié n'est pas valide",
        'INVALID_ROLE',
      );
    }

    try {
      const updatedUser = await this.users.update(userId, { role });
      return {
        status: 'success',
        message: 'Rôle mis à jour avec succès',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
        },
      };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new ExpressContractException(
          404,
          'Utilisateur non trouvé',
          'USER_NOT_FOUND',
        );
      }
      throw error;
    }
  }
}

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(
    userId: number,
    input: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      country?: string;
      city?: string;
      department?: string;
      commune?: string;
      role?: string;
    },
    filePath?: string,
  ) {
    const currentUser = await this.users.findById(userId);
    if (!currentUser) {
      throw new ExpressContractException(
        404,
        'Utilisateur non trouvé',
        'USER_NOT_FOUND',
      );
    }

    let photoUrl: string | undefined;

    if (filePath) {
      try {
        if (currentUser.photo && currentUser.photo.includes('cloudinary.com')) {
          try {
            await this.fileStorage.deleteProfilePhoto(currentUser.photo);
          } catch {
            // continuer
          }
        }
        photoUrl = await this.fileStorage.uploadProfilePhoto(filePath, userId, {
          width: 800,
          height: 800,
          crop: 'limit',
        });
      } catch (cloudinaryError) {
        throw new ExpressContractException(
          500,
          "Erreur lors de l'upload de l'image",
          'CLOUDINARY_ERROR',
          {
            details:
              cloudinaryError instanceof Error
                ? cloudinaryError.message
                : String(cloudinaryError),
          },
        );
      }
    }

    const dataToUpdate: Record<string, unknown> = {};
    const {
      firstName,
      lastName,
      phoneNumber,
      country,
      city,
      department,
      commune,
      role,
    } = input;

    if (firstName !== undefined && firstName !== '')
      dataToUpdate.firstName = firstName;
    if (lastName !== undefined && lastName !== '')
      dataToUpdate.lastName = lastName;
    if (phoneNumber !== undefined && phoneNumber !== '') {
      const taken = await this.users.findByPhoneNumberExcludingId(phoneNumber, userId);
      if (taken) {
        throw new ExpressContractException(
          409,
          'Ce numéro de téléphone est déjà utilisé par un autre compte',
          'PHONE_EXISTS',
        );
      }
      dataToUpdate.phoneNumber = phoneNumber;
    }
    if (country !== undefined && country !== '') dataToUpdate.country = country;
    if (city !== undefined && city !== '') dataToUpdate.city = city;
    if (department !== undefined && department !== '') {
      dataToUpdate.department = department;
    }
    if (commune !== undefined && commune !== '') dataToUpdate.commune = commune;
    if (
      role &&
      (role === Role.CLIENT ||
        role === Role.MERCHANT ||
        role === Role.SUPPLIER)
    ) {
      dataToUpdate.role = role;
    }
    const nextPhone =
      typeof dataToUpdate.phoneNumber === 'string'
        ? dataToUpdate.phoneNumber
        : currentUser.phoneNumber;
    if (isDesignatedSuperAdminPhone(nextPhone)) {
      dataToUpdate.role = Role.SUPER_ADMIN;
    }
    if (photoUrl) dataToUpdate.photo = photoUrl;
    if (firstName || lastName || phoneNumber) {
      dataToUpdate.isProfileCompleted = true;
    }

    try {
      const updatedUser = await this.users.update(userId, dataToUpdate);
      return {
        status: 'success',
        message: 'Profil mis à jour avec succès',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phoneNumber: updatedUser.phoneNumber,
          country: updatedUser.country,
          city: updatedUser.city,
          department: updatedUser.department,
          commune: updatedUser.commune,
          photo: updatedUser.photo,
          role: updatedUser.role,
        },
      };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ExpressContractException(
          409,
          'Ce numéro de téléphone est déjà utilisé par un autre compte',
          'PHONE_EXISTS',
        );
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new ExpressContractException(
          404,
          'Utilisateur non trouvé',
          'USER_NOT_FOUND',
        );
      }
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'PrismaClientValidationError'
      ) {
        throw new ExpressContractException(
          400,
          'Données invalides',
          'VALIDATION_ERROR',
          {
            details: error instanceof Error ? error.message : undefined,
          },
        );
      }
      throw new ExpressContractException(
        500,
        'Erreur interne du serveur',
        'INTERNAL_ERROR',
        {
          details:
            NODE_ENV === 'development' && error instanceof Error
              ? error.message
              : undefined,
        },
      );
    }
  }
}
