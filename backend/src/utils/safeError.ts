export type SafeErrorCategory = "connector" | "database" | "network" | "validation" | "system" | "unknown";

export interface SafeErrorClassification {
  category: SafeErrorCategory;
  name: "ConnectorError" | "DatabaseError" | "NetworkError" | "ValidationError" | "SystemError" | "Error" | "NonError";
  code: string | null;
}

const connectorCodes = new Set([
  "authentication", "authorization", "validation", "not_found", "rate_limited",
  "timeout", "network", "provider", "malformed_response", "disabled", "unsupported_capability"
]);
const databaseNames = new Set(["MongoError", "MongoServerError", "MongooseError"]);
const validationNames = new Set(["ValidationError", "ZodError"]);
const networkCodes = new Set(["ECONNABORTED", "ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND", "ETIMEDOUT"]);
const systemCodes = new Set(["EACCES", "EADDRINUSE", "EMFILE", "ENFILE", "ENOENT", "EPERM"]);

function errorCode(error: object): string | null {
  if (!("code" in error) || (typeof error.code !== "string" && typeof error.code !== "number")) return null;
  return String(error.code);
}

export function classifyError(error: unknown): SafeErrorClassification {
  if (!(error instanceof Error)) return { category: "unknown", name: "NonError", code: null };

  const code = errorCode(error);
  if (error.name === "ConnectorError" && code && connectorCodes.has(code)) {
    return { category: "connector", name: "ConnectorError", code };
  }
  if (databaseNames.has(error.name) || error.name.startsWith("Mongo")) {
    const numericCode = "code" in error && typeof error.code === "number" ? String(error.code) : null;
    return { category: "database", name: "DatabaseError", code: numericCode };
  }
  if (validationNames.has(error.name)) return { category: "validation", name: "ValidationError", code: null };
  if (code && networkCodes.has(code)) return { category: "network", name: "NetworkError", code };
  if (code && systemCodes.has(code)) return { category: "system", name: "SystemError", code };
  return { category: "unknown", name: "Error", code: null };
}
