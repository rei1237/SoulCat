export type DomainId = "saju" | "sukuyo" | "vedic" | "astrology" | "ziwei";
export type FishId = "mackerel" | "salmon" | "flounder" | "tuna";
export interface BirthProfile {
  birthDate: string;
  birthTime?: string;
  gender?: "male" | "female";
  calendarType: "solar";
  birthPlace?: { latitude: number; longitude: number; timezone: string };
}
export interface FortuneInput {
  personA: BirthProfile;
  personB?: BirthProfile;
  question: string;
}
export interface Evidence {
  id: string;
  label: string;
  value: unknown;
}
export interface DomainContext {
  domain: DomainId;
  engineVersion: string;
  calculatedAt: string;
  facts: Evidence[];
  limitations: string[];
}
export interface FortuneResult {
  title: string;
  summary: string;
  sections: { title: string; content: string; evidence: string[] }[];
  yeongnyangiComment: string;
  cautions: string[];
}
export interface FortuneLLMRequest {
  system: string;
  domainRules: string;
  userData: FortuneInput;
  calculatedData: DomainContext;
  userQuestion: string;
  outputSchema: object;
  sectionTitles: string[];
  promptVersion: string;
}
export interface FortuneLLMResponse {
  result: unknown;
  provider: string;
  model: string;
}
export interface LLMProvider {
  generate(request: FortuneLLMRequest): Promise<FortuneLLMResponse>;
}
export interface FortuneDomain {
  id: DomainId;
  validateInput(input: unknown): FortuneInput;
  calculate(
    input: FortuneInput,
    engineEnv?: Record<string, string>,
  ): Promise<DomainContext>;
  buildContext(calculated: DomainContext): DomainContext;
  buildPrompt(
    input: FortuneInput,
    context: DomainContext,
    fish: FishId,
  ): FortuneLLMRequest;
  validateResult(result: unknown, context: DomainContext): FortuneResult;
}
export class FortuneError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
