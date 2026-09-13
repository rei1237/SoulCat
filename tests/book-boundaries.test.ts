import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiProvider } from "../server/providers/gemini";
import { domains } from "../server/fortune";
import { profile } from "./support/database";
import { requestKasiLegacyCalendarMethod } from "../server/vendor/code-destiny/worker/routes/kasi.js";
import { createHash } from "node:crypto";
import fs from "node:fs";
import ts from "typescript";
import {StructuredChapterProvider,repeatedPassage} from '../server/providers/chapter';
import {analyze} from '../server/fortune/analysis';
import {chapterManifest} from '../server/fortune/book-contracts';
test('chapter prompts select their domain and omit unrelated lifetime triggers',async()=>{
 const input=domains.saju.validateInput({personA:profile});const context=await domains.saju.calculate(input);let captured:any;
 const provider=new StructuredChapterProvider({async generate(request){captured=request;return {result:{},provider:'fixture',model:'none'};}});
 await provider.generateChapter({chapter:chapterManifest('tuna')[0],analysis:analyze({saju:context}),previous:[]});
 const wire=JSON.stringify(captured.calculatedData);assert.ok(wire.length<JSON.stringify(context).length/2);assert.ok(!wire.includes('summaryForPrompt'));assert.ok(!wire.includes(profile.birthDate));assert.ok(captured.domainRules.includes('previousConclusions'));
 assert.deepEqual(captured.outputSchema.properties.sources.items.enum,captured.calculatedData.facts.map((f:any)=>f.id));
});
test('near-identical life examples are rejected even when a few words differ',()=>{
 const a='회사에서 아무도 해결하기 어려워하는 복잡한 문제가 생겼을 때, 손님이 먼저 나서서 해결 방안을 모색하고 밤늦게까지 자료를 분석하며 매달리는 모습으로 나타날 수 있어요.';
 assert.equal(repeatedPassage(a,a.replace('복잡한 문제','복잡한 프로젝트').replace('손님이 먼저','당신이 먼저')),true);
 assert.equal(repeatedPassage(a,'할 일 목록의 두 항목 사이에서 우선순위를 고른다면, 오늘 꼭 필요한 결과 하나를 메모하며 선택의 기준을 확인해볼 수 있어요.'),false);
});

test("Gemini structured transport is injectable and ambiguous failures are quarantined", async () => {
  const input = domains.saju.validateInput({ personA: profile });
  const context = await domains.saju.calculate(input);
  const prompt = domains.saju.buildPrompt(input, context, "mackerel");
  let calls = 0;
  const provider = new GeminiProvider(
    "test-only-key",
    "mock-model",
    async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.ok(!JSON.stringify(body).includes(profile.birthDate));
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"fixture":true}' }] },
          },
        ],
      });
    },
  );
  assert.equal((await provider.generate(prompt)).result, '{"fixture":true}');
  assert.equal(calls, 1);
  await assert.rejects(
    new GeminiProvider("fixture", "mock-model", async () => {
      throw new TypeError("offline");
    }).generate(prompt),
    /UNCERTAIN/,
  );
});
test("KASI fixture response is normalized, cached and never invents a term time", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({
      response: {
        header: { resultCode: "00", resultMsg: "NORMAL SERVICE" },
        body: {
          items: {
            item: {
              solYear: "2001",
              solMonth: "03",
              solDay: "01",
              lunYear: "2001",
              lunMonth: "02",
              lunDay: "07",
              lunLeapmonth: "평",
            },
          },
        },
      },
    });
  };
  try {
    const env = {
      KASI_SERVICE_KEY: "fixture-key",
      KASI_API_BASE_URL:
        "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService",
    };
    const params = { solYear: "2001", solMonth: "03", solDay: "01" };
    const a = await requestKasiLegacyCalendarMethod(
        env,
        "getLunCalInfo",
        params,
      ),
      b = await requestKasiLegacyCalendarMethod(env, "getLunCalInfo", params);
    assert.equal(a.rows[0].lunDay, "07");
    assert.deepEqual(a.rows, b.rows);
    assert.equal(calls, 1);
    const terms = await requestKasiLegacyCalendarMethod(
      {},
      "get24DivisionsInfo",
      { solYear: "2026" },
    );
    assert.equal(terms.source, "local");
    assert.equal(terms.rows.length, 24);
  } finally {
    globalThis.fetch = original;
  }
});
test("vendored saju declarations retain the source provenance hashes", () => {
  const provenance = JSON.parse(
    fs.readFileSync("docs/saju-runtime-provenance.json", "utf8"),
  );
  const source = fs.readFileSync(
    "server/vendor/code-destiny/saju-runtime.js",
    "utf8",
  );
  const ast = ts.createSourceFile(
    "runtime.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const map = new Map<string, string>();
  for (const n of ast.statements) {
    if (ts.isFunctionDeclaration(n) && n.name)
      map.set(n.name.text, n.getText(ast));
    if (ts.isVariableStatement(n))
      for (const d of n.declarationList.declarations)
        if (ts.isIdentifier(d.name))
          map.set(d.name.text, `var ${d.getText(ast)};`);
  }
  for (const row of provenance.symbols)
    assert.equal(
      createHash("sha256").update(map.get(row.name)!).digest("hex"),
      row.sha256,
      row.name,
    );
});
