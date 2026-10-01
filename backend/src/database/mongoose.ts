import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { classifyError } from "../utils/safeError.js";

let status: "disconnected" | "connecting" | "connected" | "degraded" = "disconnected";
let lastError: { name: string; code: string | null; occurredAt: string } | null = null;

export async function connectDatabase(): Promise<void> {
  status = "connecting";
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    status = "connected";
    lastError = null;
    logger.info("MongoDB connected");
  } catch (error) {
    status = "degraded";
    const classification = classifyError(error);
    lastError = {
      name: classification.name,
      code: classification.code,
      occurredAt: new Date().toISOString()
    };
    logger.error({ error: classification }, "MongoDB connection failed");
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  status = "disconnected";
}

export function getDatabaseStatus(): typeof status {
  return status;
}

export function getDatabaseHealth() {
  return { status, ready: isDatabaseConnected(), lastError };
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
