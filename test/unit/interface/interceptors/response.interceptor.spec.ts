import { firstValueFrom, of } from 'rxjs';
import type { CallHandler } from '@nestjs/common';
import { ResponseInterceptor } from '@interface/interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  const nextWith = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  it('ne wrappe pas un payload @Redirect() Nest', async () => {
    const redirect = {
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x',
      statusCode: 302,
    };

    await expect(
      firstValueFrom(interceptor.intercept({} as never, nextWith(redirect))),
    ).resolves.toEqual(redirect);
  });

  it('enveloppe une réponse métier dans le format API', async () => {
    await expect(
      firstValueFrom(interceptor.intercept({} as never, nextWith({ id: 1 }))),
    ).resolves.toEqual({ success: true, data: { id: 1 } });
  });
});
