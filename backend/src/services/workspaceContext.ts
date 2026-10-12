import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();
export function runInWorkspace<T>(workspaceKey: string, callback: () => T): T { return storage.run(workspaceKey, callback); }
export function currentWorkspace(): string {
  const key = storage.getStore();
  if (key) return key;
  // Existing isolated service tests predate authenticated request context.
  if (process.env.NODE_ENV === "test") return "default";
  throw new Error("Authenticated workspace context required");
}
