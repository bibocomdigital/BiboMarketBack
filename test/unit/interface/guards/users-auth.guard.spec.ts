import { ExecutionContext } from '@nestjs/common';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';
import type { JwtServicePort } from '@application/ports/output/jwt-service.port';
import type { UserRepository } from '@domain/repositories/user.repository';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';

describe('UsersAuthGuard', () => {
  const jwtService: JwtServicePort = {
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
    signPayload: jest.fn(),
    revokeToken: jest.fn(),
  };
  const users = {
    findById: jest.fn(),
  } as unknown as UserRepository;

  it('exige un header Bearer', async () => {
    const guard = new UsersAuthGuard(jwtService, users);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      statusCode: 401,
      body: { message: 'Authentification requise' },
    } as Partial<ExpressContractException>);
  });
});

describe('UsersAdminGuard', () => {
  it('refuse un utilisateur non admin', () => {
    const guard = new UsersAdminGuard();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 2, role: 'CLIENT' } }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ExpressContractException);
  });

  it('autorise un administrateur', () => {
    const guard = new UsersAdminGuard();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 1, role: 'ADMIN' } }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
