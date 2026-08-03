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
  MAIL_FROM_EMAIL: 'no-reply@example.com',
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

  it('requires Cloudinary credentials in production', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        MAIL_TRANSPORT: 'smtp',
        SMTP_HOST: 'smtp.example.com',
      }),
    ).toThrow('Cloudinary credentials are required in production');
  });

  it('accepts complete production mail and image-storage configuration', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        MAIL_TRANSPORT: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        CLOUDINARY_CLOUD_NAME: 'store-cloud',
        CLOUDINARY_API_KEY: 'cloudinary-key',
        CLOUDINARY_API_SECRET: 'cloudinary-secret',
      }),
    ).toMatchObject({
      NODE_ENV: 'production',
      CLOUDINARY_CLOUD_NAME: 'store-cloud',
    });
  });
});
