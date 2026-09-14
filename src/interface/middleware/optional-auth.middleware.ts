import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';

@Injectable()
export class OptionalAuthMiddleware implements NestMiddleware {
  constructor(
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: JwtServicePort,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Vérifier si les cookies existent
    const cookies = req.cookies || {};
    const token =
      typeof cookies.access_token === 'string'
        ? cookies.access_token
        : undefined;

    if (token) {
      try {
        const payload = await this.jwtService.verifyToken(token);
        req.user = payload;
      } catch {
        // Token invalide, mais on ne throw pas d'erreur
        req.user = undefined;
      }
    } else {
      req.user = undefined;
    }

    next();
  }
}
