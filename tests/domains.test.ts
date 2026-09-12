import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domains } from '../server/fortune';
import { MockLLMProvider } from '../server/providers/mock';
import { chartInput } from '../server/fortune/shared/time';
const p = { birthDate: '1997-02-10', birthTime: '14:30', calendarType: 'solar', gender: 'female', birthPlace: { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' } };
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) throw new Error('EXTERNAL_NETWORK_BLOCKED');
  return originalFetch(input, init);
};
for (const [id, d] of Object.entries(domains)) {
  test(`${id}: real calculation -> context -> prompt -> mock -> validated result`, async () => {
    const input = d.validateInput({ personA: p, personB: { ...p, birthDate: '1992-06-12' }, question: '관계와 일을 알고 싶어요.' });
    const c = d.buildContext(await d.calculate(input));
    assert.ok(c.facts.length > 2);
    const prompt = d.buildPrompt(input, c, 'mackerel');
    const result = d.validateResult((await new MockLLMProvider().generate(prompt)).result, c);
    assert.ok(result.sections.length >= 6);
    const other = await d.calculate({ ...input, personA: { ...input.personA, birthDate: '1985-01-02' } });
    assert.notDeepEqual(other.facts, c.facts);
  });
}
test('KST and DST ambiguity are explicit', () => {
  assert.equal(chartInput(p as Parameters<typeof chartInput>[0]).timezone, 9);
  assert.throws(() => chartInput({ ...p, calendarType: 'solar', gender: 'female', birthDate: '2024-11-03', birthTime: '01:30', birthPlace: { latitude: 40.7, longitude: -74, timezone: 'America/New_York' } }), /AMBIGUOUS/);
});
