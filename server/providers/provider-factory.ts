import { FortuneError, LLMProvider } from "../fortune/shared/contracts";
import { MockLLMProvider } from "./mock";
import { AiBinding, CloudflareAIProvider } from "./cloudflare-ai";
import { GeminiProvider } from "./gemini";
import { Database } from '../db/types';
import { BudgetEnv, budgetConfig, BudgetedGemini } from './budget';
export interface ProviderEnv extends BudgetEnv {
  LLM_PROVIDER?: string;
  ALLOW_LIVE_LLM?: string;
  AI?: AiBinding;
  CLOUDFLARE_AI_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}
export function createProvider(env: ProviderEnv, scope?: {db: Database; requestId: string}): LLMProvider {
  const provider = env.LLM_PROVIDER ?? "mock";
  if (provider === "mock") {
    if(env.APP_ENV==='production')throw new FortuneError('LLM_NOT_CONFIGURED',503);
    return new MockLLMProvider();
  }
  if (!["cloudflare", "gemini"].includes(provider))
    throw new FortuneError("UNKNOWN_PROVIDER", 503);
  if (env.ALLOW_LIVE_LLM !== "true")
    throw new FortuneError("LIVE_LLM_DISABLED", 503);
  if (provider === "gemini") {
    if(!/^[a-zA-Z0-9._-]+$/.test(env.GEMINI_MODEL||''))throw new FortuneError('INVALID_MODEL',503);
    const config=budgetConfig(env);
    if(!env.GEMINI_API_KEY || !scope) throw new FortuneError('LLM_NOT_CONFIGURED',503);
    return new BudgetedGemini(scope.db,scope.requestId,env,new GeminiProvider(env.GEMINI_API_KEY,env.GEMINI_MODEL!,fetch,config.timeout,config.output));
  }
  // Only Gemini has the required atomic cost ledger in this release.
  throw new FortuneError('LIVE_PROVIDER_NOT_APPROVED',503);
}
