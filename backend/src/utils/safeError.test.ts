import { describe, expect, it } from "vitest";
import { classifyError } from "./safeError.js";

describe("classifyError", () => {
  it("never copies unexpected messages or arbitrary codes into log metadata", () => {
    const error = Object.assign(new Error("connection string and password must stay private"), { code: "secret-code" });
    const result = classifyError(error);
    expect(result).toEqual({ category: "unknown", name: "Error", code: null });
    expect(JSON.stringify(result)).not.toContain("password");
    expect(JSON.stringify(result)).not.toContain("secret-code");
  });

  it("retains only recognized operational classifications", () => {
    const error = Object.assign(new Error("private host details"), { code: "ECONNREFUSED" });
    expect(classifyError(error)).toEqual({ category: "network", name: "NetworkError", code: "ECONNREFUSED" });
  });
});
