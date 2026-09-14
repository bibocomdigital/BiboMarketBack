import { ExecutionContext } from '@nestjs/common';
import { UsersAuthGuard } from './users-auth.guard';
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
