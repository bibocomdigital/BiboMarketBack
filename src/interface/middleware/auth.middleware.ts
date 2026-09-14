import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';
import { AppException } from '@domain/exceptions/app.exception';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Vérifier d'abord les cookies
    const cookies = req.cookies || {};
    let token =
      typeof cookies.access_token === 'string'
        ? cookies.access_token
        : undefined;

    // Si pas de token dans les cookies, vérifier l'en-tête Authorization
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Extraire le token après "Bearer "
      }
    }

    if (!token) {
      throw AppException.tokenMissing("Token d'authentification manquant");
    }

    try {
      const payload = await this.jwtService.verifyToken(token);

      req.user = payload;

      next();
    } catch {
      throw AppException.tokenInvalid("Token d'authentification invalide");
    }
  }
}
