import { FortuneError, LLMProvider } from '../fortune/shared/contracts';
import { MockLLMProvider } from './mock';
import { AiBinding, CloudflareAIProvider } from './cloudflare-ai';
import { GeminiProvider } from './gemini';
export interface ProviderEnv {
  LLM_PROVIDER?: string; ALLOW_LIVE_LLM?: string; AI?: AiBinding;
  CLOUDFLARE_AI_MODEL?: string; GEMINI_API_KEY?: string; GEMINI_MODEL?: string;
}
export function createProvider(env: ProviderEnv): LLMProvider {
  const provider = env.LLM_PROVIDER ?? 'mock';
  if (provider === 'mock') return new MockLLMProvider();
  if (!['cloudflare', 'gemini'].includes(provider)) throw new FortuneError('UNKNOWN_PROVIDER', 503);
  if (env.ALLOW_LIVE_LLM !== 'true') throw new FortuneError('LIVE_LLM_DISABLED', 503);
  if (provider === 'gemini') return new GeminiProvider(env.GEMINI_API_KEY ?? '', env.GEMINI_MODEL ?? '');
  if (!env.AI || !env.CLOUDFLARE_AI_MODEL) throw new FortuneError('LLM_NOT_CONFIGURED', 503);
  return new CloudflareAIProvider(env.AI, env.CLOUDFLARE_AI_MODEL);
}
