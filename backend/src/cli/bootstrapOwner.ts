import { stdin, stdout } from "node:process";
import { z } from "zod";
import { connectDatabase, disconnectDatabase } from "../database/mongoose.js";
import { UserModel, WorkspaceMembershipModel, WorkspaceModel } from "../models/auth.model.js";
import { hashPassword } from "../services/auth/password.js";

async function readHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Interactive terminal required for password entry");
  stdout.write(prompt);
  stdin.setRawMode(true); stdin.resume(); stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => { stdin.off("data", onData); stdin.setRawMode(false); stdin.pause(); stdout.write("\n"); };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") { cleanup(); resolve(value); return; }
        if (char === "\u0003") { cleanup(); reject(new Error("Cancelled")); return; }
        if (char === "\u007f") value = value.slice(0, -1);
        else if (char >= " " && value.length < 1024) value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("Explicit MongoDB configuration required");
  const email = z.email().max(254).parse(process.env.ATLAS_OWNER_EMAIL).trim();
  const password = await readHidden("New owner password (not echoed): ");
  const hash = await hashPassword(password);
  await connectDatabase();
  try {
    if (await UserModel.exists({}) || await WorkspaceMembershipModel.exists({ workspaceKey: "default", role: "owner" })) throw new Error("Owner bootstrap is unavailable because users or an owner already exist");
    const workspace = await WorkspaceModel.findOneAndUpdate({ key: "default" }, { $setOnInsert: { name: "Atlas workspace" } }, { upsert: true, new: true });
    if (!workspace) throw new Error("Workspace could not be prepared");
    const user = await UserModel.create({ emailNormalized: email.toLowerCase(), emailDisplay: email, passwordHash: hash, status: "active" });
    try { await WorkspaceMembershipModel.create({ workspaceKey: "default", userId: user._id, role: "owner" }); }
    catch (error) { await UserModel.deleteOne({ _id: user._id }); throw error; }
    stdout.write("Owner bootstrap completed for the default workspace.\n");
  } finally { await disconnectDatabase(); }
}

void main().catch(() => { process.stderr.write("Owner bootstrap failed; no password or connection details were printed.\n"); process.exitCode = 1; });
