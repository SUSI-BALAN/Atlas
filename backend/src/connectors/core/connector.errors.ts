export type ConnectorErrorCode =
  | "authentication" | "authorization" | "validation" | "not_found" | "rate_limited"
  | "timeout" | "network" | "provider" | "malformed_response" | "disabled" | "unsupported_capability";

export class ConnectorError extends Error {
  constructor(
    public readonly connectorId: string,
    public readonly code: ConnectorErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly statusCode: number | null = null,
    public readonly retryAfterSeconds: number | null = null
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}
