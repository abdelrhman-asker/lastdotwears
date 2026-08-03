import { z } from 'zod';

const booleanFromString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return value;
}, z.boolean());

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_VERSION: z.string().trim().min(1).default('0.1.0'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    API_PREFIX: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/)
      .default('api/v1'),
    DATABASE_URL: z
      .string()
      .trim()
      .regex(/^postgres(?:ql)?:\/\//, 'DATABASE_URL must be a PostgreSQL connection URL.'),
    CORS_ORIGINS: z
      .string()
      .trim()
      .min(1)
      .default('http://localhost:3000')
      .transform((value) => value.split(',').map((origin) => origin.trim()))
      .pipe(z.array(z.url()).min(1)),
    COOKIE_SECRET: z.string().min(32),
    JWT_ACCESS_SECRET: z.string().min(64),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    JWT_ISSUER: z.string().trim().min(1).default('egypt-fashion-api'),
    JWT_AUDIENCE: z.string().trim().min(1).default('egypt-fashion-web'),
    REFRESH_TOKEN_PEPPER: z.string().min(64),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    ONE_TIME_TOKEN_PEPPER: z.string().min(64),
    EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
    WEB_APP_URL: z.url(),
    MAIL_TRANSPORT: z.enum(['log', 'smtp']).default('log'),
    MAIL_FROM_EMAIL: z.email(),
    MAIL_FROM_NAME: z.string().trim().min(1).max(120),
    SMTP_HOST: optionalNonEmptyString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    SMTP_SECURE: booleanFromString.default(false),
    SMTP_USER: optionalNonEmptyString,
    SMTP_PASSWORD: optionalNonEmptyString,
    CLOUDINARY_CLOUD_NAME: optionalNonEmptyString,
    CLOUDINARY_API_KEY: optionalNonEmptyString,
    CLOUDINARY_API_SECRET: optionalNonEmptyString,
    CLOUDINARY_PRODUCT_FOLDER: z.string().trim().min(1).default('egypt-fashion/products'),
    PRODUCT_IMAGE_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1_000_000)
      .max(20_000_000)
      .default(8_000_000),
    GUEST_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(90),
    ORDER_NUMBER_PREFIX: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{2,8}$/)
      .default('LDW'),
    INSTAPAY_ID: z.string().trim().min(3).max(120).default('lastdotwears@instapay'),
    INSTAPAY_QR_VALUE: optionalNonEmptyString,
    INSTAPAY_INSTRUCTIONS: z
      .string()
      .trim()
      .min(10)
      .max(1_000)
      .default(
        'Transfer the exact order total, include your order number, then wait for confirmation.',
      ),
    SWAGGER_ENABLED: booleanFromString.default(true),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(100),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && environment.MAIL_TRANSPORT !== 'smtp') {
      context.addIssue({
        code: 'custom',
        path: ['MAIL_TRANSPORT'],
        message: 'MAIL_TRANSPORT must be smtp in production.',
      });
    }

    if (environment.MAIL_TRANSPORT === 'smtp' && !environment.SMTP_HOST) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required when MAIL_TRANSPORT is smtp.',
      });
    }

    if (Boolean(environment.SMTP_USER) !== Boolean(environment.SMTP_PASSWORD)) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_PASSWORD'],
        message: 'SMTP_USER and SMTP_PASSWORD must be provided together.',
      });
    }

    const cloudinaryValues = [
      environment.CLOUDINARY_CLOUD_NAME,
      environment.CLOUDINARY_API_KEY,
      environment.CLOUDINARY_API_SECRET,
    ];
    const configuredCloudinaryValues = cloudinaryValues.filter(Boolean).length;
    if (configuredCloudinaryValues > 0 && configuredCloudinaryValues < cloudinaryValues.length) {
      context.addIssue({
        code: 'custom',
        path: ['CLOUDINARY_API_SECRET'],
        message: 'All Cloudinary credentials must be provided together.',
      });
    }
    if (
      environment.NODE_ENV === 'production' &&
      configuredCloudinaryValues !== cloudinaryValues.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['CLOUDINARY_CLOUD_NAME'],
        message: 'Cloudinary credentials are required in production.',
      });
    }
  });

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function validateEnvironment(input: Record<string, unknown>): AppEnvironment {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
}
