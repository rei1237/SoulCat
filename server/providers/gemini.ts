import {
  FortuneLLMRequest,
  FortuneLLMResponse,
  LLMProvider,
  FortuneError,
} from "../fortune/shared/contracts";
import { messages } from "../fortune/shared/prompt";
// ProviderFactory is the live-call gate; tests inject a transport that never uses the network.
export class GeminiProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string,
    private transport: typeof fetch = fetch,
    private timeout = 60000,
    private outputLimit = 4096,
  ) {}
  outputTokens(request: FortuneLLMRequest) {
    const cap=request.maxOutputTokens ?? this.outputLimit;
    if(!Number.isSafeInteger(cap)||cap<=0||cap>this.outputLimit)throw new FortuneError('LLM_OUTPUT_LIMIT',503);
    return cap;
  }
  async countTokens(request: FortuneLLMRequest): Promise<number> {
    const wire=messages(request);
    try {
      const response=await this.transport.call(globalThis,`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:countTokens`,{
        method:'POST',headers:{'content-type':'application/json','x-goog-api-key':this.apiKey},
        body:JSON.stringify({generateContentRequest:{model:`models/${this.model}`,systemInstruction:{parts:[{text:wire[0].content}]},contents:[{role:'user',parts:[{text:wire[1].content}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:request.outputSchema,maxOutputTokens:this.outputTokens(request)}}}),signal:AbortSignal.timeout(this.timeout)
      });
      if(!response.ok) throw new FortuneError(`TOKEN_COUNT_HTTP_${response.status}`,503);
      const data=await response.json() as {totalTokens:number};
      if(!Number.isSafeInteger(data.totalTokens)||data.totalTokens<=0) throw new FortuneError('TOKEN_COUNT_INVALID_RESPONSE',503);
      return data.totalTokens;
    } catch(e) { if(e instanceof FortuneError)throw e; throw new FortuneError(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'TOKEN_COUNT_TIMEOUT':'TOKEN_COUNT_UNAVAILABLE',503); }
  }
  async generate(request: FortuneLLMRequest): Promise<FortuneLLMResponse> {
    if (!this.apiKey || !this.model)
      throw new FortuneError("GEMINI_NOT_CONFIGURED", 503);
    if (!/^[a-zA-Z0-9._-]+$/.test(this.model))
      throw new FortuneError("INVALID_MODEL", 503);
    try {
      const wire = messages(request);
      const response = await this.transport.call(globalThis,
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: wire[0].content }] },
            contents: [{ role: "user", parts: [{ text: wire[1].content }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: request.outputSchema,
              maxOutputTokens: this.outputTokens(request),
            },
          }),
          signal: AbortSignal.timeout(this.timeout),
        },
      );
      if (!response.ok)
        throw new FortuneError(
          response.status === 429 ? 'PROVIDER_RATE_LIMIT' : response.status >= 500 ? "UNCERTAIN" : "PROVIDER_ERROR",
          502,
        );
      const output = (await response.json()) as {
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number };
        candidates?: {
          finishReason?: string;
          content?: { parts?: { text?: string }[] };
        }[];
      };
      const candidate = output.candidates?.[0];
      if (candidate?.finishReason !== "STOP")
        throw new FortuneError("INCOMPLETE_PROVIDER_RESPONSE", 502);
      const text = candidate.content?.parts?.map((p) => p.text || "").join("");
      if (!text) throw new FortuneError("EMPTY_PROVIDER_RESPONSE", 502);
      const u=output.usageMetadata;
      const usage=u && Number.isSafeInteger(u.promptTokenCount) && Number.isSafeInteger(u.totalTokenCount) ? {input:u.promptTokenCount!,output:u.totalTokenCount!-u.promptTokenCount!}:undefined;
      return { result: text, provider: "gemini", model: this.model, usage };
    } catch (e) {
      if (e instanceof FortuneError) throw e;
      throw new FortuneError(
        e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name)
          ? "LLM_TIMEOUT"
          : "UNCERTAIN",
        502,
      );
    }
  }
}
