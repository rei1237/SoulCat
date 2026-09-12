import {
  FortuneLLMRequest,
  FortuneLLMResponse,
  LLMProvider,
  FortuneError,
} from "../fortune/shared/contracts";
// No network call until the Gemini integration has been approved and tested.
export class GeminiProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}
  async generate(_request: FortuneLLMRequest): Promise<FortuneLLMResponse> {
    if (!this.apiKey || !this.model)
      throw new FortuneError("GEMINI_NOT_CONFIGURED", 503);
    throw new FortuneError("GEMINI_INTEGRATION_PENDING", 503);
  }
}
