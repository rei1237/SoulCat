import { FortuneLLMRequest, FortuneLLMResponse, LLMProvider, FortuneError } from '../fortune/shared/contracts';
import { messages } from '../fortune/shared/prompt';
export interface AiBinding { run(model: string, input: object): Promise<{ response?: unknown }> }
export class CloudflareAIProvider implements LLMProvider {
  constructor(private ai: AiBinding, private model: string) {}
  async generate(r: FortuneLLMRequest): Promise<FortuneLLMResponse> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const output = await Promise.race([
        this.ai.run(this.model, { messages: messages(r), max_tokens: 4096, response_format: { type: 'json_schema', json_schema: r.outputSchema } }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new FortuneError('LLM_TIMEOUT', 504)), 60000); }),
      ]);
      return { result: output.response, provider: 'cloudflare', model: this.model };
    } catch (e) { throw e instanceof FortuneError ? e : new FortuneError('PROVIDER_ERROR', 502); }
    finally { clearTimeout(timer); }
  }
}
