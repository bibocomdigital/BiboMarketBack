import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';
import { AppException } from '@domain/exceptions/app.exception';
import { ErrorCode } from '@domain/enums/error-code.enum';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@domain/repositories/user.repository';
import { Role } from '@domain/types/role';

@Injectable()
export class UsersAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ExpressContractException.raw(401, {
        message: 'Authentification requise',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = await this.jwtService.verifyToken(token);

      if (!decoded.id) {
        throw ExpressContractException.raw(401, {
          message: 'Token invalide: format incorrect',
        });
      }

      const user = await this.users.findById(parseInt(String(decoded.id), 10));
      if (!user) {
        throw ExpressContractException.raw(401, {
          message: 'Utilisateur non trouvé',
        });
      }

      request.user = {
        id: user.id,
        userId: user.id,
        role: user.role as Role,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      return true;
    } catch (error) {
      if (error instanceof ExpressContractException) {
        throw error;
      }

      if (error instanceof AppException) {
        if (error.errorCode === ErrorCode.TOKEN_EXPIRED) {
          throw ExpressContractException.raw(401, {
            message: 'Votre session a expiré',
            error: 'jwt expired',
          });
        }

        throw ExpressContractException.raw(401, {
          message: 'Token invalide',
          error: error.message,
        });
      }

      throw ExpressContractException.raw(500, {
        message: "Erreur lors de l'authentification",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

@Injectable()
export class OptionalUsersAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    try {
      const decoded = await this.jwtService.verifyToken(authHeader.split(' ')[1]);
      if (!decoded.id) {
        return true;
      }

      const user = await this.users.findById(parseInt(String(decoded.id), 10));
      if (!user) {
        return true;
      }

      request.user = {
        id: user.id,
        userId: user.id,
        role: user.role as Role,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch {
      // Routes publiques Express : un token invalide n'est pas lu.
    }

    return true;
  }
}

@Injectable()
export class UsersMerchantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw ExpressContractException.raw(401, {
        message: 'Utilisateur non authentifié',
      });
    }

    if (request.user.role !== 'MERCHANT') {
      throw ExpressContractException.raw(403, {
        message:
          'Accès refusé. Seuls les commerçants peuvent accéder à cette fonctionnalité',
      });
    }

    return true;
  }
}

@Injectable()
export class UsersAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw ExpressContractException.raw(401, {
        message: 'Utilisateur non authentifié',
      });
    }

    if (request.user.role !== 'ADMIN') {
      throw ExpressContractException.raw(403, {
        message: 'Accès réservé aux administrateurs',
      });
    }

    return true;
  }
}
