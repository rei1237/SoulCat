import { Database } from "../db/types";
import { domains } from "./index";
import { getProduct } from "../payments/catalog";
import { FortuneError, LLMProvider } from "./shared/contracts";
interface RequestRow {
  id: string;
  status: string;
  entitlement_id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  input_json: string;
  lease_until?: number;
  attempt_id?: string;
}
export async function prepareGeneration(
  db: Database,
  userId: string,
  productId: string,
  profileId: string,
) {
  const p = getProduct(productId);
  const profile = await db
    .prepare("SELECT input_json,domain FROM profiles WHERE id=? AND user_id=?")
    .bind(profileId, userId)
    .first<{ input_json: string; domain: string }>();
  if (!profile || profile.domain !== p.domain)
    throw new FortuneError("PROFILE_NOT_FOUND", 404);
  const input = domains[p.domain].validateInput(JSON.parse(profile.input_json));
  const entitlement = await db
    .prepare(
      "SELECT e.id FROM entitlements e JOIN orders o ON o.id=e.order_id WHERE e.user_id=? AND e.product_id=? AND e.status='ACTIVE' AND o.profile_id=? AND o.status='PAID' ORDER BY e.created_at LIMIT 1",
    )
    .bind(userId, productId, profileId)
    .first<{ id: string }>();
  if (!entitlement) throw new FortuneError("ENTITLEMENT_REQUIRED", 403);
  await db
    .prepare(
      "INSERT INTO fortune_requests (id,entitlement_id,user_id,profile_id,product_id,domain,question,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'PENDING',?,?) ON CONFLICT(entitlement_id) DO NOTHING",
    )
    .bind(
      crypto.randomUUID(),
      entitlement.id,
      userId,
      profileId,
      productId,
      p.domain,
      input.question,
      Date.now(),
      Date.now(),
    )
    .run();
  return (await db
    .prepare("SELECT id,status FROM fortune_requests WHERE entitlement_id=?")
    .bind(entitlement.id)
    .first<{ id: string; status: string }>())!;
}
export async function runGeneration(
  db: Database,
  id: string,
  provider: LLMProvider,
  engineEnv: Record<string, string> = {},
) {
  const token = crypto.randomUUID();
  const acquired = await db
    .prepare(
      "UPDATE fortune_requests SET status='RUNNING',attempt_id=?,lease_until=?,failure_code=NULL,updated_at=? WHERE id=? AND status IN ('PENDING','FAILED') AND EXISTS (SELECT 1 FROM entitlements e WHERE e.id=fortune_requests.entitlement_id AND e.status='ACTIVE')",
    )
    .bind(token, Date.now() + 300000, Date.now(), id)
    .run();
  if (!acquired.meta.changes) return;
  try {
    const row = await db
      .prepare(
        "SELECT r.*,p.input_json FROM fortune_requests r JOIN profiles p ON p.id=r.profile_id WHERE r.id=?",
      )
      .bind(id)
      .first<RequestRow>();
    if (!row) throw new FortuneError("REQUEST_NOT_FOUND", 404);
    const product = getProduct(row.product_id);
    const d = domains[product.domain];
    const input = d.validateInput(JSON.parse(row.input_json));
    const calculated = d.buildContext(await d.calculate(input, engineEnv));
    const prompt = d.buildPrompt(input, calculated, product.fishId);
    await db
      .prepare(
        "UPDATE fortune_requests SET calculated_context=?,prompt_version=? WHERE id=? AND attempt_id=?",
      )
      .bind(JSON.stringify(calculated), prompt.promptVersion, id, token)
      .run();
    const response = await provider.generate(prompt);
    const result = d.validateResult(response.result, calculated);
    await db.batch([
      db
        .prepare(
          "INSERT INTO fortune_results (request_id,structured_result,provider,model,prompt_version,created_at) SELECT id,?,?,?,?,? FROM fortune_requests WHERE id=? AND attempt_id=? AND status='RUNNING' AND EXISTS (SELECT 1 FROM entitlements e WHERE e.id=fortune_requests.entitlement_id AND e.status='ACTIVE') ON CONFLICT(request_id) DO NOTHING",
        )
        .bind(
          JSON.stringify(result),
          response.provider,
          response.model,
          prompt.promptVersion,
          Date.now(),
          id,
          token,
        ),
      db
        .prepare(
          "UPDATE fortune_requests SET status='SUCCEEDED',provider=?,model=?,lease_until=NULL,updated_at=? WHERE id=? AND attempt_id=? AND EXISTS (SELECT 1 FROM fortune_results f WHERE f.request_id=fortune_requests.id)",
        )
        .bind(response.provider, response.model, Date.now(), id, token),
    ]);
  } catch (e) {
    const code = e instanceof FortuneError ? e.code : "GENERATION_FAILED";
    // A timed-out external call may still be running. Never auto-reissue it.
    await db
      .prepare(
        "UPDATE fortune_requests SET status=?,failure_code=?,lease_until=NULL,updated_at=? WHERE id=? AND attempt_id=? AND status='RUNNING'",
      )
      .bind(
        code === "LLM_TIMEOUT" ? "UNCERTAIN" : "FAILED",
        code,
        Date.now(),
        id,
        token,
      )
      .run();
  }
}
