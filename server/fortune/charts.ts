import {products,type Product} from '../payments/catalog';
import { domains } from "./index";
import { Database } from "../db/types";
import {
  DomainId,
  DomainContext,
  FortuneInput,
  FortuneError,
  FishId,
  PackageId,
} from "./shared/contracts";
import { requestKasiLegacyCalendarMethod } from "../vendor/code-destiny/worker/routes/kasi.js";
import { solarToLunar } from "../vendor/code-destiny/lib/korean-calendar/index.js";

export interface ChartView {
  domain: DomainId;
  title: string;
  groups: { label: string; image?:string; reversed?:boolean; items: { label: string; value: string }[] }[];
  limitations: string[];
  source: string;
}
export interface Snapshot {
  id: string;
  profile_id: string;
  user_id: string;
  domain: DomainId;
  as_of: string;
  contexts_json: string;
  chart_json: string;
  engine_version: string;
}
const titles: Record<DomainId, string> = {
  saju: "너의 사주 원국",
  ziwei: "너의 열두 궁",
  sukuyo: "너의 별이 머무는 자리",
  vedic: "너의 라시 차트",
  astrology: "너의 별자리 차트",
  tarot: "너의 카드 배열",
};
function display(v: unknown): string {
  if (v == null) return "미상";
  if (Array.isArray(v)) return v.map(display).join(" · ");
  if (typeof v === "object")
    return Object.entries(v)
      .map(([k, x]) => `${k}: ${display(x)}`)
      .join(" · ");
  return String(v);
}
export function chartView(c: DomainContext, source = "local"): ChartView {
  const f = Object.fromEntries(
    c.facts.map((x) => [x.label, x.value]),
  ) as Record<string, any>;
  const groups: ChartView["groups"] = [];
  if(c.domain==='tarot'){for(const card of f.cards||[])groups.push({label:card.positionLabel||({self_view_of_other:'내가 바라보는 상대',other_view_of_relationship:'관계에 대한 상대의 시선 · 상징',other_feeling_toward_me:'상대 감정의 가능성 · 상징',other_romantic_will:'다가올 의지의 가능성',core_block:'관계의 핵심 장애물',short_term_outcome:'가까운 선택의 방향',current:'현재의 상황',inner:'내면의 마음',obstacle:'장애물',external:'주변의 영향',choice:'선택의 갈림길',action:'행동의 방향',cause:'원인',process:'과정',outcome:'결과'} as Record<string,string>)[card.positionKey]||card.positionKey,image:card.imageUrl?.replace('/tarot-cards/','/_soulcat/assets/tarot/').replace(/\.jpe?g$/i,'.webp'),reversed:card.orientation==='reversed',items:[{label:'카드',value:card.nameKr||card.nameKo||card.name},{label:'방향',value:card.orientation==='reversed'?'역방향':'정방향'}]});source='기존 타로 카드·스프레드 · 서버에서 확정한 배열';}
  else if (c.domain === "saju") {
    ["year", "month", "day", "hour"].forEach((key, i) =>
      groups.push({
        label: ["년주", "월주", "일주", "시주"][i],
        items: [
          { label: "천간·지지", value: display(f.pillars?.[key]) },
          {
            label: "천간 십성",
            value: display(f.tenGodsByPillar?.[key]?.stemTenGod),
          },
          {
            label: "지지 십성",
            value: display(f.tenGodsByPillar?.[key]?.primaryHiddenTenGod),
          },
        ],
      }),
    );
    groups.push({
      label: "오행 · 월령 가중치 포함",
      items: Object.entries(f.fiveElements?.counts || f.fiveElements || {})
        .filter(([, v]) => typeof v === "number")
        .map(([label, value]) => ({
          label:
            (
              {
                wood: "목",
                fire: "화",
                earth: "토",
                metal: "금",
                water: "수",
              } as Record<string, string>
            )[label] || label,
          value: display(value),
        })),
    });
  } else if (c.domain === "ziwei") {
    for (const p of f.palaces || [])
      groups.push({
        label: `${p.name} · ${p.earthlyBranch}`,
        items: [
          { label: "주성", value: display(p.mainStars) || "빈 궁" },
          { label: "보조성", value: display(p.assistantStars) || "없음" },
          { label: "사화", value: display(p.transformations) || "없음" },
        ],
      });
  } else if (c.domain === "sukuyo") {
    for (const [key, label] of [
      ["personA", "나의 본명숙"],
      ["personB", "상대의 본명숙"],
    ])
      if (f[key])
        groups.push({
          label,
          items: [
            {
              label: "본명숙",
              value: display(
                f[key].name ||
                  f[key].nameKo ||
                  f[key].mansion?.name ||
                  f[key].index,
              ),
            },
            { label: "27숙 위치", value: display(Number(f[key].index) + 1) },
          ],
        });
    if (f.relation)
      groups.push({
        label: "두 사람의 관계",
        items: [
          { label: "관계", value: display(f.relation.relationType) },
          {
            label: "나 / 상대",
            value: `${f.relation.aRole} / ${f.relation.bRole}`,
          },
          { label: "정방향 거리", value: display(f.forwardDistance) },
        ],
      });
  } else if (c.domain === "vedic") {
    const signs = [
      "Pisces",
      "Aries",
      "Taurus",
      "Gemini",
      "Aquarius",
      "Cancer",
      "Capricorn",
      "Leo",
      "Sagittarius",
      "Scorpio",
      "Libra",
      "Virgo",
    ];
    const ko: Record<string, string> = {
      Aries: "양자리",
      Taurus: "황소자리",
      Gemini: "쌍둥이자리",
      Cancer: "게자리",
      Leo: "사자자리",
      Virgo: "처녀자리",
      Libra: "천칭자리",
      Scorpio: "전갈자리",
      Sagittarius: "사수자리",
      Capricorn: "염소자리",
      Aquarius: "물병자리",
      Pisces: "물고기자리",
    };
    for (const sign of signs)
      groups.push({
        label: ko[sign] + (f.lagna?.sign === sign ? " · 라그나" : ""),
        items: [
          {
            label: "행성 · 하우스",
            value:
              (f.planets || [])
                .filter((p: any) => p.sign === sign)
                .map((p: any) => `${p.nameKo || p.name} ${p.house}H`)
                .join(" · ") || "—",
          },
        ],
      });
    groups.push({
      label: "달의 자리",
      items: [
        { label: "낙샤트라", value: display(f.moon?.nakshatra) },
        { label: "파다", value: display(f.moon?.pada) },
      ],
    });
  } else
    groups.push({
      label: "계산 차트",
      items: c.facts
        .filter((f) => ["planets", "ascendant", "houses"].includes(f.label))
        .map((f) => ({ label: f.label, value: display(f.value) })),
    });
  if (source === "local" && ["vedic", "sukuyo", "astrology"].includes(c.domain))
    source = "Swiss Ephemeris · 기존 서비스의 천문 계산";
  return {
    domain: c.domain,
    title: titles[c.domain],
    groups,
    limitations: c.limitations,
    source,
  };
}
export async function createChart(
  db: Database,
  userId: string,
  profileId: string,
  env: Record<string, string>,
) {
  const existing = await db
    .prepare("SELECT * FROM chart_snapshots WHERE profile_id=? AND user_id=?")
    .bind(profileId, userId)
    .first<Snapshot>();
  if (existing) return existing;
  const profile = await db
    .prepare("SELECT domain,input_json FROM profiles WHERE id=? AND user_id=?")
    .bind(profileId, userId)
    .first<{ domain: DomainId; input_json: string }>();
  if (!profile) throw new FortuneError("PROFILE_NOT_FOUND", 404);
  const input = domains[profile.domain].validateInput(
    JSON.parse(profile.input_json),
  );
  const asOf = new Date().toISOString();
  let source = "local";
  if (["saju", "ziwei"].includes(profile.domain) && env.KASI_SERVICE_KEY) {
    const [solYear, solMonth, solDay] = input.personA!.birthDate.split("-");
    const lunar = await requestKasiLegacyCalendarMethod(env, "getLunCalInfo", {
      solYear,
      solMonth,
      solDay,
    });
    const core = solarToLunar(+solYear, +solMonth, +solDay);
    const reference = lunar.rows?.[0];
    if (
      !core ||
      !reference ||
      Number(reference.lunYear) !== core.lunarYear ||
      Number(reference.lunMonth) !== core.lunarMonth ||
      Number(reference.lunDay) !== core.lunarDay
    )
      throw new FortuneError("CALENDAR_REFERENCE_MISMATCH", 503);
    const terms = await requestKasiLegacyCalendarMethod(
      env,
      "get24DivisionsInfo",
      { solYear, numOfRows: "30" },
    );
    source = `음양력 ${lunar.source} · 절기 ${terms.source}`;
  }
  const calculated = await domains[profile.domain].calculate(input, {
    ...env,
    AS_OF: asOf,
  });
  const chart = chartView(calculated, source);
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO chart_snapshots (id,profile_id,user_id,domain,engine_version,as_of,contexts_json,chart_json,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(profile_id) DO NOTHING",
    )
    .bind(
      id,
      profileId,
      userId,
      profile.domain,
      calculated.engineVersion,
      asOf,
      JSON.stringify({ [profile.domain]: calculated }),
      JSON.stringify(chart),
      Date.now(),
    )
    .run();
  return (await db
    .prepare("SELECT * FROM chart_snapshots WHERE profile_id=? AND user_id=?")
    .bind(profileId, userId)
    .first<Snapshot>())!;
}
export function requireTierInput(input: FortuneInput, tier: PackageId) {
  if (
    input.personA && ["flounder", "tuna"].includes(tier) &&
    (!input.personA.birthTime ||
      !input.personA.birthPlace ||
      !input.personA.gender)
  )
    throw new FortuneError("PREMIUM_BIRTH_REQUIRED", 400);
}
export async function purchaseContexts(
  db: Database,
  userId: string,
  profileId: string,
  domain: DomainId,
  tier: PackageId,
  env: Record<string, string>,
  legacy=false,
  fixedProduct?:Product,
) {
  const row = await db
    .prepare("SELECT domain,input_json FROM profiles WHERE id=? AND user_id=?")
    .bind(profileId, userId)
    .first<{ domain: DomainId; input_json: string }>();
  if (!row || row.domain !== domain)
    throw new FortuneError("PROFILE_NOT_FOUND", 404);
  const input = domains[domain].validateInput(JSON.parse(row.input_json));
  if(legacy && tier==='tuna' && domain==='sukuyo' && input.readingMode!=='personal')throw new FortuneError('PREMIUM_PERSONAL_ONLY',400);
  requireTierInput(input, tier);
  const snapshot = await createChart(db, userId, profileId, env);
  const contexts = JSON.parse(snapshot.contexts_json) as Partial<
    Record<DomainId, DomainContext>
  >;
  const p=fixedProduct||products.find(p=>p.domain===domain&&p.fishId===tier);
  if(!p)throw new FortuneError('PRODUCT_NOT_FOUND',404);
  const extra:DomainId[]=legacy?(tier==='tuna'?['saju','ziwei','sukuyo','vedic']:tier==='flounder'?[domain==='saju'?'ziwei':'saju']:[]):p.systems;
  for (const d of extra)
    if (!contexts[d]) {
      const cached = await db
        .prepare(
          "SELECT context_json FROM chart_domain_contexts WHERE chart_id=? AND domain=?",
        )
        .bind(snapshot.id, d)
        .first<{ context_json: string }>();
      if (cached) {
        contexts[d] = JSON.parse(cached.context_json);
        continue;
      }
      const calculated = await domains[d].calculate(
        domains[d].validateInput({ ...input, readingMode: "personal" }),
        { ...env, AS_OF: snapshot.as_of, ...(p.readingKind!=='single'?{TAROT_FUSION:'true'}:{}) },
      );
      await db
        .prepare(
          "INSERT INTO chart_domain_contexts (chart_id,domain,context_json) VALUES (?,?,?) ON CONFLICT DO NOTHING",
        )
        .bind(snapshot.id, d, JSON.stringify(calculated))
        .run();
      const saved = await db
        .prepare(
          "SELECT context_json FROM chart_domain_contexts WHERE chart_id=? AND domain=?",
        )
        .bind(snapshot.id, d)
        .first<{ context_json: string }>();
      contexts[d] = JSON.parse(saved!.context_json);
    }
  return { snapshot, contexts };
}
