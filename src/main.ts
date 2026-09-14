import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FRONTEND_URL, FRONTEND_URL_ANDROID, FRONTEND_URL_IOS, NODE_ENV } from '@application/config/env';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from '@interface/filters/global-exception.filter';
import { ResponseInterceptor } from '@interface/interceptors/response.interceptor';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins: string[] = [
    FRONTEND_URL,
    FRONTEND_URL_ANDROID,
    FRONTEND_URL_IOS,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: (origin, callback) => {
      // Native mobile / curl / same-origin: no Origin header
      if (!origin) {
        return callback(null, true);
      }

      const isAllowedConfigured = allowedOrigins.some((allowed) => {
        try {
          const allowedUrl = new URL(allowed);
          const requestUrl = new URL(origin);

          if (allowedUrl.origin === requestUrl.origin) {
            return true;
          }

          return requestUrl.hostname.endsWith(`.${allowedUrl.hostname}`);
        } catch {
          return allowed === origin;
        }
      });

      // Flutter web / Vite / Next use random localhost ports in dev
      let isLocalDevOrigin = false;
      try {
        const requestUrl = new URL(origin);
        const isLocalHost =
          requestUrl.hostname === 'localhost' ||
          requestUrl.hostname === '127.0.0.1';
        isLocalDevOrigin =
          NODE_ENV !== 'production' && isLocalHost;
      } catch {
        isLocalDevOrigin = false;
      }

      if (isAllowedConfigured || isLocalDevOrigin) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        console.warn('allowedOrigins:', allowedOrigins);
        callback(new Error('Origin not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Enable cookie parser
  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix('api');

  //Prisma enable shutdown hooks
  const prismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  const config = new DocumentBuilder()
    .setTitle('Bibocom Market API')
    .setDescription('The Bibocom Market API description')
    .setVersion('1.0')
    .addTag('Bibocom Market')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
