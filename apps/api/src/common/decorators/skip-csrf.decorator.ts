import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

export const REQUIRE_CSRF_TOKEN_KEY = 'requireCsrfToken';
export const RequireCsrfToken = () => SetMetadata(REQUIRE_CSRF_TOKEN_KEY, true);
