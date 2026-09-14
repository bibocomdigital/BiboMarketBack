import { ExecutionContext } from '@nestjs/common';
import { ExpressAuthGuard } from '@interface/guards/express-auth.guard';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import type { JwtServicePort } from '@application/ports/output/jwt-service.port';
import { Role } from '@domain/types/role';

describe('ExpressAuthGuard', () => {
  const jwtService: JwtServicePort = {
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
    signPayload: jest.fn(),
    revokeToken: jest.fn(),
  };

  const createContext = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization } }),
      }),
    }) as ExecutionContext;

  it('renvoie TOKEN_REQUIRED sans Authorization', async () => {
    const guard = new ExpressAuthGuard(jwtService);

    await expect(guard.canActivate(createContext())).rejects.toMatchObject({
      statusCode: 401,
      code: 'TOKEN_REQUIRED',
    } satisfies Partial<ExpressContractException>);
  });

  it('attache id et userId après vérification', async () => {
    (jwtService.verifyToken as jest.Mock).mockResolvedValue({
      id: 12,
      role: Role.CLIENT,
    });
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: 'Bearer abc' },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    const guard = new ExpressAuthGuard(jwtService);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 12,
      role: Role.CLIENT,
      userId: 12,
    });
  });
});
