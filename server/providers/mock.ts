import {
  FortuneLLMRequest,
  FortuneLLMResponse,
  LLMProvider,
  FortuneError,
} from "../fortune/shared/contracts";
export class MockLLMProvider implements LLMProvider {
  constructor(
    private mode:
      | "success"
      | "timeout"
      | "malformed"
      | "empty"
      | "error" = "success",
  ) {}
  async generate(r: FortuneLLMRequest): Promise<FortuneLLMResponse> {
    if (this.mode === "timeout") throw new FortuneError("LLM_TIMEOUT", 504);
    if (this.mode === "error") throw new FortuneError("PROVIDER_ERROR", 502);
    const result =
      this.mode === "malformed"
        ? "{"
        : this.mode === "empty"
          ? ""
          : {
              title: "영냥이 상담 · 개발 검증용",
              summary:
                "이 결과는 Mock으로 만든 화면·저장 흐름 검증 자료입니다. 실제 개인 운세 상담이 아닙니다.",
              sections: r.sectionTitles.map((title, i) => ({
                title,
                content: `${title} 화면을 확인하는 개발용 예시입니다. 계산 근거 ${i + 1}번이 연결되어 있으며, 실제 상담 문장은 승인된 모델을 연결한 뒤 생성됩니다.`,
                evidence: [
                  r.calculatedData.facts[i % r.calculatedData.facts.length].id,
                ],
              })),
              yeongnyangiComment:
                "서두르지 마. 지금은 상담방을 준비하는 중이야.",
              cautions: [
                ...r.calculatedData.limitations,
                "Mock 결과: 개인 해석으로 사용하지 마세요.",
              ],
            };
    return { result, provider: "mock", model: `fixture-${this.mode}-v1` };
  }
}
