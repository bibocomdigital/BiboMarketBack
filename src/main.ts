import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FRONTEND_URL, FRONTEND_URL_ANDROID, FRONTEND_URL_IOS } from '@application/config/env';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from '@interface/filters/global-exception.filter';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins: string[] = [
    FRONTEND_URL,
    FRONTEND_URL_ANDROID,
    FRONTEND_URL_IOS,
  ].filter((origin): origin is string => Boolean(origin));

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.some((allowed) => {
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

      if (isAllowed) {
        callback(null, true);
      } else {
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
