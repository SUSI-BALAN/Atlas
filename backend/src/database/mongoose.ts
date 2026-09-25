import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

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
    lastError = {
      name: error instanceof Error ? error.name : "DatabaseError",
      code: typeof error === "object" && error !== null && "code" in error ? String(error.code) : null,
      occurredAt: new Date().toISOString()
    };
    logger.error({ err: error }, "MongoDB connection failed");
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
