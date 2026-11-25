import { validateEnvironment } from './environment.js';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://commerce:commerce@localhost:5432/commerce',
  CORS_ORIGINS: 'http://localhost:3000,https://www.last-dot.com,https://last-dot.com',
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
  it.each([
    ['465', undefined, true],
    ['465', '', true],
    ['587', undefined, false],
    ['2525', 'true', true],
    ['2525', 'false', false],
  ])('resolves SMTP TLS mode for port %s when SMTP_SECURE is %s', (port, secure, expected) => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        SMTP_PORT: port,
        SMTP_SECURE: secure,
      }).SMTP_SECURE,
    ).toBe(expected);
  });

  it('defaults the support sender and destination independently of the public address', () => {
    expect(
      validateEnvironment({ ...validEnvironment, MAIL_FROM_EMAIL: 'public@example.test' }),
    ).toMatchObject({
      SUPPORT_MAIL_FROM_EMAIL: 'support@last-dot.com',
      SUPPORT_NOTIFICATION_EMAIL: 'support@last-dot.com',
    });
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        SUPPORT_MAIL_FROM_EMAIL: 'not-email',
        SUPPORT_NOTIFICATION_EMAIL: 'also-not-email',
      }),
    ).toThrow(/SUPPORT_MAIL_FROM_EMAIL.*SUPPORT_NOTIFICATION_EMAIL/u);
  });

  it('allows one SMTP mailbox to run when the other has an incomplete credential pair', () => {
    const config = validateEnvironment({
      ...validEnvironment,
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'orders@example.test',
      SMTP_PASSWORD: 'fixture-orders',
      SUPPORT_SMTP_USER: 'support@example.test',
    });
    expect(config.MAIL_TRANSPORT).toBe('smtp');
    expect(config.SUPPORT_SMTP_PASSWORD).toBeUndefined();
  });

  it('preserves the full InstaPay payment link and requires a corresponding configured ID', () => {
    const paymentUrl = 'https://ipn.eg/S/Fixture/instapay/AbC%2F09?token=a%2Bb';
    expect(validateEnvironment(validEnvironment).INSTAPAY_ID).toBeUndefined();
    expect(() =>
      validateEnvironment({ ...validEnvironment, INSTAPAY_QR_VALUE: paymentUrl }),
    ).toThrow('INSTAPAY_ID');
    expect(
      validateEnvironment({
        ...validEnvironment,
        INSTAPAY_ID: 'fixture@instapay',
        INSTAPAY_QR_VALUE: paymentUrl,
      }).INSTAPAY_QR_VALUE,
    ).toBe(paymentUrl);
  });

  it.each([
    'http://ipn.eg/S/fixture',
    'https://ipn.eg.example/S/fixture',
    'https://other@ipn.eg/S/fixture',
  ])('rejects an unapproved InstaPay payment link %s', (paymentUrl) => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        INSTAPAY_ID: 'fixture@instapay',
        INSTAPAY_QR_VALUE: paymentUrl,
      }),
    ).toThrow('INSTAPAY_QR_VALUE');
  });

  it('keeps admin setup disabled by default and requires a strong secret when enabled', () => {
    expect(validateEnvironment(validEnvironment).ADMIN_SETUP_ENABLED).toBe(false);
    expect(() => validateEnvironment({ ...validEnvironment, ADMIN_SETUP_ENABLED: 'true' })).toThrow(
      'ADMIN_SETUP_SECRET',
    );
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        ADMIN_SETUP_ENABLED: 'true',
        ADMIN_SETUP_SECRET: 'weak',
      }),
    ).toThrow('ADMIN_SETUP_SECRET');
    expect(
      validateEnvironment({
        ...validEnvironment,
        ADMIN_SETUP_ENABLED: 'true',
        ADMIN_SETUP_SECRET: '12ab'.repeat(16),
      }).ADMIN_SETUP_ENABLED,
    ).toBe(true);
  });
  it('requires Cloudinary credentials only when using Cloudinary', () => {
    expect(validateEnvironment(validEnvironment).STORAGE_PROVIDER).toBe('local');
    expect(() =>
      validateEnvironment({ ...validEnvironment, STORAGE_PROVIDER: 'cloudinary' }),
    ).toThrow(/CLOUDINARY_CLOUD_NAME.*CLOUDINARY_API_KEY.*CLOUDINARY_API_SECRET/u);
    expect(
      validateEnvironment({
        ...validEnvironment,
        STORAGE_PROVIDER: 'cloudinary',
        CLOUDINARY_CLOUD_NAME: 'test-cloud',
        CLOUDINARY_API_KEY: 'test-key',
        CLOUDINARY_API_SECRET: 'test-secret',
      }).STORAGE_PROVIDER,
    ).toBe('cloudinary');
  });
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
      CORS_ORIGINS: ['http://localhost:3000', 'https://www.last-dot.com', 'https://last-dot.com'],
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
        SMTP_HOST: 'smtp.zoho.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'orders@last-dot.com',
        SMTP_PASSWORD: 'server-only-app-password',
        SUPPORT_SMTP_USER: 'support@last-dot.com',
        SUPPORT_SMTP_PASSWORD: 'fixture-support-app-password',
        UPLOAD_ROOT: '/app/uploads',
      }),
    ).toMatchObject({
      NODE_ENV: 'production',
      SUPPORT_SMTP_USER: 'support@last-dot.com',
      SUPPORT_MAIL_FROM_EMAIL: 'support@last-dot.com',
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      UPLOAD_ROOT: '/app/uploads',
    });
  });
});
