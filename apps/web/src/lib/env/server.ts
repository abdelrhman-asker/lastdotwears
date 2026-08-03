import { z } from 'zod';

const serverEnvironmentSchema = z.object({
  INTERNAL_API_URL: z.url(),
});

export function getServerEnvironment() {
  return serverEnvironmentSchema.parse({
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
  });
}
