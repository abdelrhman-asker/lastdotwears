process.env.NODE_ENV = 'test';
process.env.APP_VERSION = '0.1.0-test';
process.env.PORT = '4001';
process.env.API_PREFIX = 'api/v1';
process.env.DATABASE_URL = 'postgresql://commerce:commerce@localhost:5432/commerce_test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.COOKIE_SECRET = 'test-cookie-secret-with-at-least-32-characters';
process.env.JWT_ACCESS_SECRET =
  'jwt-access-secret-that-is-at-least-sixty-four-characters-long-for-tests';
process.env.REFRESH_TOKEN_PEPPER =
  'refresh-token-pepper-that-is-at-least-sixty-four-characters-long-tests';
process.env.ONE_TIME_TOKEN_PEPPER =
  'one-time-token-pepper-that-is-at-least-sixty-four-characters-tests';
process.env.WEB_APP_URL = 'http://localhost:3000';
process.env.MAIL_TRANSPORT = 'log';
process.env.MAIL_FROM_EMAIL = 'no-reply@example.com';
process.env.MAIL_FROM_NAME = 'Test Store';
process.env.CLOUDINARY_PRODUCT_FOLDER = 'test/products';
process.env.PRODUCT_IMAGE_MAX_BYTES = '8000000';
process.env.SWAGGER_ENABLED = 'false';
process.env.LOG_LEVEL = 'fatal';
process.env.RATE_LIMIT_TTL_MS = '60000';
process.env.RATE_LIMIT_LIMIT = '1000';
