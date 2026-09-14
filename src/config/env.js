const { z } = require("zod");
require("dotenv").config();

// Fail fast on boot if required secrets are missing or malformed —
// never let the app start silently with an insecure default.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Secrets — enforce a real minimum length so a weak value fails at boot,
  // not silently in production.
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be >= 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be >= 32 chars"),
  ANON_ID_SALT: z.string().min(32, "ANON_ID_SALT must be >= 32 chars"),

  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODERATION_MODEL: z.string().default("gemini-1.5-flash"),
  GEMINI_SUMMARY_MODEL: z.string().default("gemini-1.5-pro"),

  CORS_ORIGINS: z.string().default(""), // comma-separated allowlist

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:");
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
