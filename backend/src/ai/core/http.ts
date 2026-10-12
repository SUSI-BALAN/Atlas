import { AIProviderError } from "./aiProvider.js";
export async function aiFetch(url:string,init:RequestInit,signal:AbortSignal){
  try { const response=await fetch(url,{...init,signal}); if(response.status===401||response.status===403)throw new AIProviderError("authentication","AI provider authentication failed");if(response.status===429)throw new AIProviderError("rate_limited","AI provider is rate limited");if(!response.ok)throw new AIProviderError(response.status>=500?"unavailable":"invalid_request","AI provider request failed");return response; }
  catch(error){if(error instanceof AIProviderError)throw error;if(signal.aborted)throw new AIProviderError("timeout","AI provider request timed out");throw new AIProviderError("unavailable","AI provider is unavailable");}
}
export async function aiJson(response:Response):Promise<any>{try{return await response.json()}catch{throw new AIProviderError("malformed","AI provider returned an invalid response")}}
