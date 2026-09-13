import {READING_VERSION,readingPolicies} from '../fortune/reading-policy';
import {getProduct} from '../payments/catalog';
import { Database } from '../db/types';
import { FortuneError, FortuneLLMRequest, LLMProvider } from '../fortune/shared/contracts';
import { GeminiProvider } from './gemini';
export interface BudgetEnv {
  APP_ENV?: string; LLM_COST_MODE?: string; LLM_TEST_BUDGET_KRW?: string; LLM_REQUEST_BUDGET_KRW?: string; LLM_DAILY_BUDGET_KRW?: string;
  LLM_TIMEOUT_MS?: string; LLM_MAX_RETRIES?: string; LLM_MAX_INPUT_TOKENS?: string; LLM_MAX_OUTPUT_TOKENS?: string;
  GEMINI_MODEL?: string; GEMINI_PRICING_MODEL?: string; GEMINI_INPUT_USD_PER_MILLION?: string;
  GEMINI_OUTPUT_USD_PER_MILLION?: string; LLM_USD_KRW_CEILING?: string; LLM_PRICING_VALID_UNTIL?: string;
  LLM_VERIFIED_PRODUCTS?: string;
}
export function budgetConfig(env: BudgetEnv) {
  const number = (v: string | undefined) => v?.trim() ? Number(v) : NaN;
  const metered=env.APP_ENV==='production' && env.LLM_COST_MODE==='metered';
  const c = { testTotal: metered ? Number.MAX_SAFE_INTEGER/1e6 : number(env.LLM_TEST_BUDGET_KRW), request: metered ? Number.MAX_SAFE_INTEGER/1e6 : 1000, daily: metered ? Number.MAX_SAFE_INTEGER/1e6 : number(env.LLM_DAILY_BUDGET_KRW),
    timeout: number(env.LLM_TIMEOUT_MS), retries: number(env.LLM_MAX_RETRIES), input: number(env.LLM_MAX_INPUT_TOKENS), output: number(env.LLM_MAX_OUTPUT_TOKENS),
    inputRate: number(env.GEMINI_INPUT_USD_PER_MILLION), outputRate: number(env.GEMINI_OUTPUT_USD_PER_MILLION), fx: number(env.LLM_USD_KRW_CEILING) };
  if (!['staging','production'].includes(env.APP_ENV || '') || !env.GEMINI_MODEL || env.GEMINI_PRICING_MODEL !== env.GEMINI_MODEL ||
    !env.LLM_PRICING_VALID_UNTIL || !Number.isFinite(Date.parse(env.LLM_PRICING_VALID_UNTIL)) || Date.parse(env.LLM_PRICING_VALID_UNTIL) <= Date.now() ||
    Object.entries(c).some(([k,v]) => !Number.isFinite(v) || (k === 'retries' ? v < 0 : v <= 0)) ||
    (env.APP_ENV==='production' && !metered) || (!metered && env.LLM_COST_MODE!=='test') || (!metered && (c.daily > 1000 || c.testTotal > 1000)) || c.timeout > 60000 || c.retries > 2 || !Number.isInteger(c.retries) || !Number.isInteger(c.input) || !Number.isInteger(c.output) || c.output > 8192)
    throw new FortuneError('LLM_BUDGET_NOT_CONFIGURED',503);
  return c;
}
export function productBudgetReady(env: BudgetEnv, productId: string, chapterCount: number) {
  const c = budgetConfig(env);
  let verified: Record<string, { model: string; chapters: number; maxKRW: number; manifestVersion?:string; outputTokens?:number }>;
  try { verified = JSON.parse(env.LLM_VERIFIED_PRODUCTS || '{}'); } catch { throw new FortuneError('PRODUCT_LLM_UNVERIFIED',503); }
  const p = verified[productId];
  const output=readingPolicies[getProduct(productId).fishId].outputTokens;
  if (!p || p.model !== env.GEMINI_MODEL || p.chapters !== chapterCount || p.manifestVersion !== READING_VERSION || p.outputTokens!==output || c.output<output || !Number.isFinite(p.maxKRW) || p.maxKRW <= 0 || (env.APP_ENV!=='production' && p.maxKRW > c.daily)) throw new FortuneError('PRODUCT_LLM_UNVERIFIED',503);
}
export const kstDay = (now: number) => new Date(now + 9*3600000).toISOString().slice(0,10);
export async function reserveCost(db: Database, requestId: string, amount: number, requestLimit: number, dailyLimit: number, now = Date.now(), totalLimit: number | null = null, metered=false) {
  const id=crypto.randomUUID(), day=kstDay(now);
  if(metered){await db.prepare('INSERT INTO llm_reservations(id,request_id,day,reserved,created_at) VALUES (?,?,?,?,?)').bind(id,requestId,day,amount,now).run();return id;}
  const result=await db.prepare(`INSERT INTO llm_reservations(id,request_id,day,reserved,created_at)
    SELECT ?,?,?,?,? WHERE
    (SELECT COALESCE(SUM(COALESCE(charged,reserved)),0) FROM llm_reservations WHERE request_id=?)+?<=? AND
    (SELECT COALESCE(SUM(COALESCE(charged,reserved)),0) FROM llm_reservations WHERE day=?)+?<=? AND (? IS NULL OR (SELECT COALESCE(SUM(COALESCE(charged,reserved)),0) FROM llm_reservations)+?<=?)`).bind(id,requestId,day,amount,now,requestId,amount,requestLimit,day,amount,dailyLimit,totalLimit,amount,totalLimit).run();
  if (!result.meta.changes) {
    if(totalLimit!==null){const total=await db.prepare('SELECT COALESCE(SUM(COALESCE(charged,reserved)),0) n FROM llm_reservations').first<{n:number}>();if((total?.n||0)+amount>totalLimit)throw new FortuneError('LLM_TEST_BUDGET',503);}
    const used=await db.prepare('SELECT COALESCE(SUM(COALESCE(charged,reserved)),0) n FROM llm_reservations WHERE request_id=?').bind(requestId).first<{n:number}>();
    throw new FortuneError((used?.n || 0)+amount>requestLimit?'LLM_REQUEST_BUDGET':'LLM_DAILY_BUDGET',503);
  }
  return id;
}
export class BudgetedGemini implements LLMProvider {
  constructor(private db: Database, private requestId: string, private env: BudgetEnv, private provider: GeminiProvider) {}
  async generate(request: FortuneLLMRequest) {
    const active=await this.db.prepare("SELECT r.id FROM fortune_requests r JOIN entitlements e ON e.id=r.entitlement_id WHERE r.id=? AND e.status='ACTIVE'").bind(this.requestId).first();
    if(!active)throw new FortuneError('ENTITLEMENT_REQUIRED',403);
    const c=budgetConfig(this.env);
    const output=this.provider.outputTokens(request);
    const input=await this.provider.countTokens(request);
    if (input>c.input) throw new FortuneError('LLM_INPUT_LIMIT',503);
    // micro-KRW; round upward. Full output cap includes any billable thinking tokens.
    const cost=(i:number,o:number)=>Math.ceil((i*c.inputRate+o*c.outputRate)*c.fx);
    for(let attempt=0;;attempt++) {
      const reservation=await reserveCost(this.db,this.requestId,cost(input,output),Math.floor(c.request*1e6),Math.floor(c.daily*1e6),Date.now(),this.env.APP_ENV==='production'?null:Math.floor(c.testTotal*1e6),this.env.APP_ENV==='production');
      try {
        const response=await this.provider.generate(request);
        const usage=response.usage;
        if(usage && Number.isSafeInteger(usage.input) && Number.isSafeInteger(usage.output) && usage.input>=0 && usage.output>=0) {
          await this.db.prepare("UPDATE llm_reservations SET charged=?,state='SETTLED' WHERE id=? AND state='RESERVED'").bind(cost(usage.input,usage.output),reservation).run();
        }
        return response;
      } catch(e) {
        // Unknown outcome stays fully reserved. Only a definite rate rejection retries.
        if (!(e instanceof FortuneError) || e.code!=='PROVIDER_RATE_LIMIT' || attempt>=c.retries) throw e;
        await new Promise(resolve=>setTimeout(resolve,250*2**attempt));
      }
    }
  }
}
