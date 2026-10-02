import { stdin, stdout } from "node:process";
import { z } from "zod";
import { connectDatabase, disconnectDatabase } from "../database/mongoose.js";
import { AuthSessionModel, UserModel } from "../models/auth.model.js";
import { hashPassword } from "../services/auth/password.js";

async function readHidden(): Promise<string> {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Interactive terminal required");
  stdout.write("New password (not echoed): "); stdin.setRawMode(true); stdin.resume(); stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const stop = () => { stdin.off("data", onData); stdin.setRawMode(false); stdin.pause(); stdout.write("\n"); };
    const onData = (chunk: string) => { for (const char of chunk) {
      if (char === "\r" || char === "\n") { stop(); resolve(value); return; }
      if (char === "\u0003") { stop(); reject(new Error("Cancelled")); return; }
      if (char === "\u007f") value = value.slice(0, -1);
      else if (char >= " " && value.length < 1024) value += char;
    } };
    stdin.on("data", onData);
  });
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("Explicit MongoDB configuration required");
  const email = z.email().max(254).parse(process.env.ATLAS_OWNER_EMAIL).trim().toLowerCase();
  const passwordHash = await hashPassword(await readHidden());
  await connectDatabase();
  try {
    const user = await UserModel.findOne({ emailNormalized: email, status: "active" });
    if (!user) throw new Error("Active account not found");
    await AuthSessionModel.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await UserModel.updateOne({ _id: user._id, status: "active" }, { $set: { passwordHash } });
    stdout.write("Password updated and existing sessions revoked.\n");
  } finally { await disconnectDatabase(); }
}

void main().catch(() => { process.stderr.write("Password reset failed; no account or password details were printed.\n"); process.exitCode = 1; });
