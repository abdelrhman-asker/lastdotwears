import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter.js';

export async function createApplication() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const pinoLogger = app.get(PinoLogger);
  const apiPrefix = configService.getOrThrow<string>('API_PREFIX');
  const corsOrigins = configService.getOrThrow<string[]>('CORS_ORIGINS');
  const expressApp = app.getHttpAdapter().getInstance() as unknown as Express;

  app.useLogger(pinoLogger);
  app.flushLogs();
  app.enableShutdownHooks();
  app.setGlobalPrefix(apiPrefix);

  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: [
      'authorization',
      'content-type',
      'x-csrf-token',
      'x-idempotency-key',
      'x-request-id',
    ],
    exposedHeaders: ['x-request-id'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(compression());
  app.use(cookieParser(configService.getOrThrow<string>('COOKIE_SECRET')));

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
    }),
  );

  app.useGlobalFilters(new ProblemDetailsFilter(app.get(HttpAdapterHost)));

  if (configService.getOrThrow<boolean>('SWAGGER_ENABLED')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Egypt Fashion Commerce API')
      .setDescription('REST API for the customer storefront and secure administration panel.')
      .setVersion(configService.getOrThrow<string>('APP_VERSION'))
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Egypt Fashion Commerce API',
      jsonDocumentUrl: 'docs/openapi.json',
    });
  }

  return app;
}

export async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');

  await app.listen(port, '0.0.0.0');
  app.get(PinoLogger).log(`API listening on port ${port}`, 'Bootstrap');
}
