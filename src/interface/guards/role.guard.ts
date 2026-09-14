import { Role } from '@domain/types/role';
import { ROLES_KEY } from '@interface/decorators/role';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';
import { AppException } from '@domain/exceptions/app.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si des rôles sont spécifiés via décorateur, les utiliser
    if (requiredRoles && requiredRoles.length > 0) {
      return this.handleDecoratorRoles(context, requiredRoles);
    }

    // Sinon, vérifier si c'est une route ADMIN par défaut (comportement de l'ancien roles.guard.ts)
    return this.handleAdminOnly(context);
  }

  private async handleDecoratorRoles(
    context: ExecutionContext,
    requiredRoles: Role[],
  ): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    // Vérifier si l'utilisateur est authentifié
    if (!user) {
      throw AppException.authenticationRequired(
        'Authentification requise pour accéder à cette ressource',
      );
    }

    // Vérifier si l'utilisateur a le rôle requis
    if (!requiredRoles.includes(user.role)) {
      throw AppException.forbidden(
        `Accès refusé. Rôle '${user.role}' non autorisé. Rôles requis: ${requiredRoles.join(', ')}`,
        {
          userRole: user.role,
          requiredRoles,
          userId: user.userId,
        },
      );
    }

    return true;
  }

  private async handleAdminOnly(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookies = request.cookies || {};

    // Vérifier d'abord les cookies, puis l'en-tête Authorization
    let token =
      typeof cookies.access_token === 'string'
        ? cookies.access_token
        : undefined;

    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw AppException.tokenMissing("Token d'authentification manquant");
    }

    const payload = await this.jwtService.verifyToken(token);
    const userRole = payload.role;

    if (userRole !== Role.ADMIN) {
      throw AppException.forbidden(
        'Accès interdit. Seuls les administrateurs peuvent accéder à cette ressource.',
      );
    }

    return true;
  }
}
