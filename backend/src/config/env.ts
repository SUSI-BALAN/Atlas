import "dotenv/config";
import { z } from "zod";

const optionalSecret = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const optionalUrl = z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional());
const booleanValue = z.preprocess((value) => {
  if (typeof value === "string" && /^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_HOST: z.string().optional(),
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  FRONTEND_ORIGIN: optionalUrl,
  FRONTEND_URL: optionalUrl,
  FRONTEND_ORIGINS: z.string().optional(),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/multi_forge"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(10000),
  CONNECTOR_CONCURRENCY: z.coerce.number().int().min(1).max(10).optional(),
  SEARCH_CONCURRENCY: z.coerce.number().int().min(1).max(10).optional(),
  SEARCH_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(86400).default(300),
  MAX_EXPANDED_QUERIES: z.coerce.number().int().min(1).max(20).default(5),
  GITHUB_ENABLED: booleanValue.default(true),
  GITHUB_BASE_URL: z.string().url().default("https://github.com"),
  GITHUB_API_URL: optionalUrl,
  GITHUB_API_BASE_URL: optionalUrl,
  GITHUB_API_VERSION: z.string().default("2022-11-28"),
  GITHUB_TOKEN: optionalSecret,
  GITLAB_ENABLED: booleanValue.default(false),
  GITLAB_BASE_URL: z.string().url().default("https://gitlab.com"),
  GITLAB_API_BASE_URL: optionalUrl,
  GITLAB_TOKEN: optionalSecret,
  CODEBERG_ENABLED: booleanValue.default(false),
  CODEBERG_BASE_URL: z.string().url().default("https://codeberg.org"),
  CODEBERG_API_BASE_URL: optionalUrl,
  CODEBERG_TOKEN: optionalSecret,
  GITEA_ENABLED: booleanValue.default(false),
  GITEA_BASE_URL: z.string().url().default("https://gitea.com"),
  GITEA_API_BASE_URL: optionalUrl,
  GITEA_TOKEN: optionalSecret,
  FORGEJO_ENABLED: booleanValue.default(false),
  FORGEJO_BASE_URL: z.string().url().default("https://v15.next.forgejo.org"),
  FORGEJO_API_BASE_URL: optionalUrl,
  FORGEJO_TOKEN: optionalSecret,
  AI_PROVIDER: z.enum(["none", "local", "deepseek", "openai"]).default("none"),
  LOCAL_AI_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  LOCAL_AI_MODEL: z.string().optional(),
  OPENAI_API_KEY: optionalSecret,
  DEEPSEEK_API_KEY: optionalSecret,
  AI_API_KEY: optionalSecret,
  REDIS_URL: optionalSecret
});

const apiUrl = (base: string, path: string): string => new URL(path, `${base.replace(/\/$/, "")}/`).toString();

export function parseEnvironment(input: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
  const value = parsed.data;
  const configuredOrigins = value.FRONTEND_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean)
    ?? [value.FRONTEND_ORIGIN ?? value.FRONTEND_URL].filter((origin): origin is string => Boolean(origin));
  const localOrigins = value.NODE_ENV === "production" ? [] : [
    "http://localhost:5175", "http://127.0.0.1:5175", "http://localhost:5173", "http://127.0.0.1:5173"
  ];
  const frontendOrigins = [...new Set([...configuredOrigins, ...localOrigins])].map((origin) => {
    const url = new URL(origin);
    if (!/^https?:$/.test(url.protocol) || url.origin === "null") throw new Error("FRONTEND_ORIGINS must contain explicit HTTP(S) origins");
    return url.origin;
  });
  if (frontendOrigins.length === 0) throw new Error("At least one frontend origin is required");
  return {
    ...value,
    BACKEND_HOST: value.BACKEND_HOST ?? (value.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
    PORT: value.BACKEND_PORT ?? value.PORT ?? 4000,
    FRONTEND_URL: frontendOrigins[0],
    FRONTEND_ORIGINS: frontendOrigins,
    SEARCH_CONCURRENCY: value.CONNECTOR_CONCURRENCY ?? value.SEARCH_CONCURRENCY ?? 3,
    GITHUB_API_BASE_URL: value.GITHUB_API_URL ?? value.GITHUB_API_BASE_URL ?? "https://api.github.com",
    GITLAB_API_BASE_URL: value.GITLAB_API_BASE_URL ?? apiUrl(value.GITLAB_BASE_URL, "api/v4/"),
    CODEBERG_API_BASE_URL: value.CODEBERG_API_BASE_URL ?? apiUrl(value.CODEBERG_BASE_URL, "api/v1/"),
    GITEA_API_BASE_URL: value.GITEA_API_BASE_URL ?? apiUrl(value.GITEA_BASE_URL, "api/v1/"),
    FORGEJO_API_BASE_URL: value.FORGEJO_API_BASE_URL ?? apiUrl(value.FORGEJO_BASE_URL, "api/v1/")
  };
}

export const env = parseEnvironment(process.env);
export type Environment = typeof env;
