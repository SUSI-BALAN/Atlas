import "dotenv/config";
import { z } from "zod";

const optionalSecret = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5001),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/internet_collector"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  GITHUB_TOKEN: optionalSecret,
  GITHUB_API_BASE_URL: z.string().url().default("https://api.github.com"),
  GITHUB_API_VERSION: z.string().default("2022-11-28"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(10000),
  MAX_SEARCH_RESULTS: z.coerce.number().int().min(1).max(100).default(50),
  SEARCH_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  AI_PROVIDER: z.enum(["none", "local", "deepseek", "openai"]).default("none"),
  AI_API_KEY: optionalSecret,
  REDIS_URL: optionalSecret
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
export type Environment = typeof env;
