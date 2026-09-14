import { JwtPayload } from '@application/dto/request/compte.request.dto';
import { Login } from '@application/dto/response/compte.response.dto';

export type { JwtPayload };

export interface JwtServicePort {
  verifyToken(token: string): Promise<JwtPayload>;
  generateToken(payload: JwtPayload, expiresIn?: string): Promise<Login>;
  signPayload(
    payload: Record<string, unknown>,
    expiresIn?: string,
  ): Promise<string>;
  revokeToken(token: Login): Promise<void>;
}
export const JWT_SERVICE_TOKEN = 'JWT_SERVICE_TOKEN';

