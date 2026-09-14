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
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';

@Injectable()
export class ExpressAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new ExpressContractException(
        401,
        "Token d'authentification requis",
        'TOKEN_REQUIRED',
      );
    }

    try {
      const payload = await this.jwtService.verifyToken(token);
      const id = payload.id;
      request.user = {
        ...payload,
        id,
        userId: payload.userId ?? id,
      };
      return true;
    } catch {
      throw new ExpressContractException(
        403,
        'Token invalide ou expiré',
        'INVALID_TOKEN',
      );
    }
  }
}

@Injectable()
export class ExpressAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.user?.role !== 'ADMIN') {
      throw new ExpressContractException(
        403,
        'Accès réservé aux administrateurs',
        'UNAUTHORIZED',
      );
    }

    return true;
  }
}

export function currentUserId(request: Request): number {
  return Number(request.user?.userId ?? request.user?.id);
}
