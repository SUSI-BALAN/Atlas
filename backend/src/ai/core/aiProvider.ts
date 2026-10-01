export type AIProviderId = "none" | "local" | "deepseek" | "openai";
export type AICitation = { citationId: string; claim: string };
export type AIUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
export type AIRequest = { systemInstruction: string; question: string; context: string; history: Array<{ role: "user" | "assistant"; content: string }>; maxOutputTokens: number; signal: AbortSignal };
export type AIResponse = { answer: string; citations: AICitation[]; insufficientContext: boolean; usage: AIUsage | null };
export type AIHealth = { status: "disabled" | "ready" | "unavailable" | "misconfigured" | "authentication_failed" | "rate_limited" };

export interface AIProvider { id: AIProviderId; model: string | null; external: boolean; generate(request: AIRequest): Promise<AIResponse>; health(): Promise<AIHealth>; }
export class AIProviderError extends Error { constructor(public readonly code: "disabled"|"timeout"|"authentication"|"rate_limited"|"malformed"|"unavailable"|"invalid_request", message: string) { super(message); } }

export const parseStructuredResponse = (value: unknown): AIResponse => {
  let parsed: any = value;
  if (typeof value === "string") { try { parsed = JSON.parse(value); } catch { throw new AIProviderError("malformed", "AI provider returned an invalid response"); } }
  if (!parsed || typeof parsed.answer !== "string" || !Array.isArray(parsed.citations) || typeof parsed.insufficientContext !== "boolean") throw new AIProviderError("malformed", "AI provider returned an invalid response");
  return { answer: parsed.answer, insufficientContext: parsed.insufficientContext, citations: parsed.citations.filter((item:any)=>item&&typeof item.citationId==="string"&&typeof item.claim==="string").map((item:any)=>({citationId:item.citationId,claim:item.claim})), usage: parsed.usage ?? null };
};
