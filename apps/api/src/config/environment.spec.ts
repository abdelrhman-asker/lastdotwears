import { validateEnvironment } from './environment.js';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://commerce:commerce@localhost:5432/commerce',
  CORS_ORIGINS: 'http://localhost:3000,https://shop.example.com',
  COOKIE_SECRET: 'a-secure-test-secret-that-is-over-32-characters',
  JWT_ACCESS_SECRET: 'jwt-access-secret-that-is-at-least-sixty-four-characters-long-for-tests',
  REFRESH_TOKEN_PEPPER: 'refresh-token-pepper-that-is-at-least-sixty-four-characters-long-tests',
  ONE_TIME_TOKEN_PEPPER: 'one-time-token-pepper-that-is-at-least-sixty-four-characters-tests',
  WEB_APP_URL: 'http://localhost:3000',
  MAIL_TRANSPORT: 'log',
  MAIL_FROM_EMAIL: 'support@last-dot.com',
  MAIL_FROM_NAME: 'Test Store',
};

describe('validateEnvironment', () => {
  it('coerces supported values and applies defaults', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        PORT: '4100',
        SWAGGER_ENABLED: 'false',
      }),
    ).toMatchObject({
      NODE_ENV: 'test',
      PORT: 4100,
      SWAGGER_ENABLED: false,
      CORS_ORIGINS: ['http://localhost:3000', 'https://shop.example.com'],
      UPLOAD_ROOT: './uploads',
      RATE_LIMIT_LIMIT: 100,
    });
  });

  it('rejects a short cookie secret', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        COOKIE_SECRET: 'too-short',
      }),
    ).toThrow('Environment validation failed');
  });

  it('rejects a non-PostgreSQL database URL', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: 'mysql://localhost/commerce',
      }),
    ).toThrow('DATABASE_URL must be a PostgreSQL connection URL');
  });

  it('requires SMTP mail delivery in production', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
      }),
    ).toThrow('MAIL_TRANSPORT must be smtp in production');
  });

  it('accepts production mail and local image-storage configuration', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        MAIL_TRANSPORT: 'smtp',
        EMAIL_FROM: 'Last Dot <orders@last-dot.com>',
        SMTP_HOST: 'smtp.zoho.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'orders@last-dot.com',
        SMTP_PASSWORD: 'server-only-app-password',
        UPLOAD_ROOT: '/app/uploads',
      }),
    ).toMatchObject({
      NODE_ENV: 'production',
      EMAIL_FROM: 'Last Dot <orders@last-dot.com>',
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      UPLOAD_ROOT: '/app/uploads',
    });
  });
});
