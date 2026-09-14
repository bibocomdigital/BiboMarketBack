import { Global, Module } from '@nestjs/common';
import { JWT_SERVICE_TOKEN } from '@application/ports/output/jwt-service.port';
import { JsonWebTokenService } from './jwt.service';

@Global()
@Module({
  providers: [
    {
      provide: JWT_SERVICE_TOKEN,
      useClass: JsonWebTokenService,
    },
  ],
  exports: [JWT_SERVICE_TOKEN],
})
export class JwtTokenModule {}
