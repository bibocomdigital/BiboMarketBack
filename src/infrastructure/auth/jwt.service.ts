import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { JWT_SECRET } from '@application/config/env';
import type { JwtPayload } from '@application/dto/request/compte.request.dto';
import type { Login } from '@application/dto/response/compte.response.dto';
import type { JwtServicePort } from '@application/ports/output/jwt-service.port';
import { AppException } from '@domain/exceptions/app.exception';

const DEFAULT_EXPIRES_IN = '30d';

@Injectable()
export class JsonWebTokenService implements JwtServicePort {
  async verifyToken(token: string): Promise<JwtPayload> {
    const secret = this.getSecret();
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw AppException.tokenInvalid("Token d'authentification invalide");
    }

    const [header, payload, signature] = parts;
    const expected = this.sign(`${header}.${payload}`, secret);

    if (!this.timingSafeEqual(signature, expected)) {
      throw AppException.tokenInvalid("Token d'authentification invalide");
    }

    const decoded = this.decodePayload(payload);

    if (typeof decoded.exp === 'number' && decoded.exp * 1000 < Date.now()) {
      throw AppException.tokenExpired('Votre session a expiré');
    }

    const rawId = decoded.id ?? decoded.userId;
    const id = Number(rawId);

    if (!Number.isFinite(id)) {
      throw AppException.tokenInvalid('Token invalide: format incorrect');
    }

    return {
      id,
      userId: decoded.userId !== undefined ? Number(decoded.userId) : id,
      role: decoded.role,
      phoneNumber: decoded.phoneNumber,
      email: decoded.email,
    };
  }

  async generateToken(
    payload: JwtPayload,
    expiresIn: string = DEFAULT_EXPIRES_IN,
  ): Promise<Login> {
    const secret = this.getSecret();
    const id = payload.id ?? payload.userId;

    if (id === undefined) {
      throw AppException.internal(
        'Impossible de générer un token sans id utilisateur',
      );
    }

    const tokenPayload = {
      id,
      userId: payload.userId ?? id,
      role: payload.role,
      phoneNumber: payload.phoneNumber,
      email: payload.email,
    };

    const access = this.createToken(tokenPayload, secret, expiresIn);
    const refresh = this.createToken(tokenPayload, secret, expiresIn);

    return { access, refresh };
  }

  async signPayload(
    payload: Record<string, unknown>,
    expiresIn: string = DEFAULT_EXPIRES_IN,
  ): Promise<string> {
    return this.createToken(payload, this.getSecret(), expiresIn);
  }

  async revokeToken(_token: Login): Promise<void> {
    // L'ancien backend ne persistait pas de liste de révocation.
  }

  private createToken(
    payload: Record<string, unknown>,
    secret: string,
    expiresIn: string,
  ): string {
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const now = Math.floor(Date.now() / 1000);
    const body = this.encode({
      ...payload,
      iat: now,
      exp: now + this.parseExpiresIn(expiresIn),
    });
    const signature = this.sign(`${header}.${body}`, secret);

    return `${header}.${body}.${signature}`;
  }

  private decodePayload(payload: string): {
    id?: number | string;
    userId?: number | string;
    role?: JwtPayload['role'];
    phoneNumber?: string | null;
    email?: string | null;
    exp?: number;
  } {
    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw AppException.tokenInvalid("Token d'authentification invalide");
    }
  }

  private encode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private sign(input: string, secret: string): string {
    return createHmac('sha256', secret).update(input).digest('base64url');
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);

    if (!match) {
      return 30 * 24 * 60 * 60;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return value * (multipliers[unit] ?? 1);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    if (left.length !== right.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < left.length; i += 1) {
      mismatch |= left[i] ^ right[i];
    }

    return mismatch === 0;
  }

  private getSecret(): string {
    if (!JWT_SECRET) {
      throw AppException.internal('JWT_SECRET is not configured');
    }

    return JWT_SECRET;
  }
}
