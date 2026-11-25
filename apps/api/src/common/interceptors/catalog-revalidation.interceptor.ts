import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { mergeMap, type Observable } from 'rxjs';

const mutationMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class CatalogRevalidationInterceptor<T> implements NestInterceptor<T, T> {
  private readonly logger = new Logger(CatalogRevalidationInterceptor.name);

  constructor(private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const method = context.switchToHttp().getRequest<Request>().method;
    const secret = this.config.get<string>('CATALOG_REVALIDATION_SECRET');
    if (!secret || !mutationMethods.has(method)) return next.handle();

    return next.handle().pipe(
      mergeMap(async (result) => {
        await this.revalidate(secret);
        return result;
      }),
    );
  }

  private async revalidate(secret: string): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const url = new URL(
          '/api/internal/catalog/revalidate',
          this.config.getOrThrow<string>('WEB_APP_URL'),
        );
        const response = await fetch(url, {
          method: 'POST',
          headers: { authorization: `Bearer ${secret}` },
          redirect: 'error',
          signal: AbortSignal.timeout(1_500),
        });
        if (response.status === 204) return;
        await response.body?.cancel();
      } catch {
        // The catalog write has committed, so a delivery error must not fail the mutation.
      }
    }
    this.logger.warn('Storefront catalog revalidation failed. Cached data will expire normally.');
  }
}
