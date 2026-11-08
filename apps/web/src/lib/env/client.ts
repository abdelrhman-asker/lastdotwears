import { z } from 'zod';

const optionalPublicValue = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);
const optionalPublicUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
);

const clientEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.email(),
  NEXT_PUBLIC_POSTHOG_KEY: optionalPublicValue,
  NEXT_PUBLIC_POSTHOG_HOST: optionalPublicUrl,
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.enum(['true', 'false']).optional(),
});

export const clientEnvironment = clientEnvironmentSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
});
