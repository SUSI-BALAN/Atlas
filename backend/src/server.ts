import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./database/mongoose.js";

const app = createApp();

const server = app.listen(env.PORT, env.BACKEND_HOST, () => {
  logger.info({ host: env.BACKEND_HOST, port: env.PORT }, "API listening");
});

void connectDatabase().catch(() => {
  logger.warn("API remains available in degraded mode without database persistence");
});

server.on("error", (error: NodeJS.ErrnoException) => {
  logger.fatal({ err: error, code: error.code, host: env.BACKEND_HOST, port: env.PORT }, "API failed to bind");
  process.exitCode = 1;
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
