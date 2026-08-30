import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let status: "disconnected" | "connecting" | "connected" | "degraded" = "disconnected";

export async function connectDatabase(): Promise<void> {
  status = "connecting";
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    status = "connected";
    logger.info("MongoDB connected");
  } catch (error) {
    status = "degraded";
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

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
