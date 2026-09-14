jest.mock('@application/config/env', () => ({
  JWT_SECRET: 'test-secret',
}));

import { createHmac } from 'node:crypto';
import { Role } from '@domain/types/role';
import { JsonWebTokenService } from './jwt.service';

describe('JsonWebTokenService', () => {
  const service = new JsonWebTokenService();

  it('génère un token HS256 et le vérifie avec id numérique', async () => {
    const tokens = await service.generateToken({
      id: 42,
      role: Role.CLIENT,
      email: 'client@test.com',
    });

    const payload = await service.verifyToken(tokens.access);

    expect(payload.id).toBe(42);
    expect(payload.userId).toBe(42);
    expect(payload.role).toBe(Role.CLIENT);
    expect(payload.email).toBe('client@test.com');
  });

  it('accepte un token Express historique signé avec { id }', async () => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        id: 7,
        phoneNumber: '+221770000000',
        role: 'MERCHANT',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'test-secret')
      .update(`${header}.${body}`)
      .digest('base64url');

    const payload = await service.verifyToken(`${header}.${body}.${signature}`);

    expect(payload.id).toBe(7);
    expect(payload.role).toBe(Role.MERCHANT);
  });
});
