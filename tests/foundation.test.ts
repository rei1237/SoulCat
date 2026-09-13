import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "../server/providers/provider-factory";
import { MockLLMProvider } from "../server/providers/mock";
import { buildPrompt } from "../server/fortune/shared/prompt";
import { validateResult } from "../server/fortune/shared/result";
import { validateInput } from "../server/fortune/shared/input";
import { getProduct, products } from "../server/payments/catalog";
import type { DomainContext } from "../server/fortune/shared/contracts";
const context: DomainContext = {
  domain: "saju",
  engineVersion: "test",
  calculatedAt: "2026-09-12",
  facts: [{ id: "saju.day", label: "일간", value: "甲" }],
  limitations: [],
};
const input = {
  personA: { birthDate: "1997-02-10", gender: "female", calendarType: "solar" },
  question: "직업이 궁금해요",
};
test("provider defaults to mock and live providers fail closed", () => {
  assert.ok(createProvider({}) instanceof MockLLMProvider);
  for (const LLM_PROVIDER of ["cloudflare", "gemini", "typo"])
    assert.throws(() => createProvider({ LLM_PROVIDER }));
});
test("calendar validation rejects rollover and unavailable hour-dependent charts", () => {
  assert.throws(() =>
    validateInput(
      { ...input, personA: { ...input.personA!, birthDate: "2025-02-30" } },
      "saju",
    ),
  );
  assert.equal(validateInput(input, "saju").personA!.birthTime, undefined);
  for (const domain of ["ziwei", "vedic", "astrology", "sukuyo"] as const)
    assert.throws(() => validateInput(input, domain));
});
test("mock success validates; bad JSON/empty/errors do not become results", async () => {
  const r = buildPrompt(
    validateInput(input, "saju"),
    context,
    "mackerel",
    "명리",
    ["성격", "조언"],
  );
  const output = await createProvider({}).generate(r);
  assert.equal(validateResult(output.result, context).sections.length, 2);
  for (const mode of ["malformed", "empty"] as const)
    assert.throws(() =>
      validateResult(mode === "malformed" ? "{" : "", context),
    );
  for (const mode of ["timeout", "error"] as const)
    await assert.rejects(() => new MockLLMProvider(mode).generate(r));
  const forged = structuredClone(output.result) as {
    sections: { evidence: string[] }[];
  };
  forged.sections[0].evidence = ["invented"];
  assert.throws(() => validateResult(forged, context), /INVALID_EVIDENCE/);
});
test("all domains share confirmed fish prices; client objects are not products", () => {
  assert.equal(products.length, 28);
  assert.equal(getProduct("saju_mackerel").priceKRW, 1000);
  assert.equal(getProduct("sukuyo_tuna").priceKRW, 10000);
  assert.throws(() => getProduct({ id: "saju_mackerel", priceKRW: 1 }));
});
