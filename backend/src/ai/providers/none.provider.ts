import { AIProviderError, type AIHealth, type AIProvider, type AIRequest, type AIResponse } from "../core/aiProvider.js";
export class NoneAIProvider implements AIProvider{id="none" as const;model=null;external=false;async health():Promise<AIHealth>{return{status:"disabled"}}async generate(_request:AIRequest):Promise<AIResponse>{throw new AIProviderError("disabled","AI is disabled")}}
