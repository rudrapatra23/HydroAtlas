import { z } from "zod";

/**
 * Build-time env validation. The app fails fast at module load
 * when a required variable is missing or malformed. No fallbacks.
 *
 * NEXT_PUBLIC_* variables are inlined into the browser bundle at
 * build time, so this check is also what protects the client.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = Object.freeze(parsed.data);
