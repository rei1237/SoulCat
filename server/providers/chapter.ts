import {READING_VERSION,PROMPT_VERSION} from '../fortune/reading-policy';
import {validateReadingQuality} from '../fortune/reading-quality';
import {selectChapterFacts} from '../fortune/chapter-facts';
import {
  ChapterBody,
  ChapterSpec,
  MasterAnalysis,
} from "../fortune/book-contracts";
import {
  FortuneError,
  LLMProvider,
  DomainContext,
} from "../fortune/shared/contracts";
import { explanationFacts } from "../fortune/shared/privacy";
import { persona } from "../prompts/persona/yeongnyangi";
import { fortuneMaster } from "../prompts/system/fortune-master";
import { domainRules } from "../prompts/domain/rules";
import { taskRules } from "../prompts/task/rules";
export interface ChapterRequest {
  chapter: ChapterSpec;
  analysis: MasterAnalysis;
  previous: (Pick<ChapterBody, "summary" | "example" | "topics"> & Partial<ChapterBody>)[];
  repair?: { code: string };
}
export interface FortuneChapterProvider {
  receipt?: { provider: string; model: string };
  generateChapter(input: ChapterRequest): Promise<unknown>;
}
export function repeatedPassage(a:string,b:string) {
  const grams=(text:string)=>{const clean=text.replace(/[^\p{L}\p{N}]/gu,'');return new Set(Array.from({length:Math.max(0,clean.length-2)},(_,i)=>clean.slice(i,i+3)));};
  const left=grams(a),right=grams(b);
  if(left.size<35||right.size<35)return a===b;
  let shared=0;for(const part of left)if(right.has(part))shared++;
  return 2*shared/(left.size+right.size)>.68;
}
export function validateChapter(
  value: unknown,
  input: ChapterRequest,
): ChapterBody {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new FortuneError("INVALID_CHAPTER");
    }
  }
  const v = value as ChapterBody;
  const text = (s: unknown) =>
    typeof s === "string" &&
    s.trim().length > 0 &&
    s.length <= 5000 &&
    !/<\/?[a-z][^>]*>/i.test(s);
  if (
    !v ||
    !text(v.summary) ||
    !text(v.example) ||
    !text(v.advice) ||
    !text(v.persona) ||
    !Array.isArray(v.analysis) ||
    (input.chapter.version !== READING_VERSION && v.analysis.length < 1) ||
    v.analysis.length > 8 ||
    !v.analysis.every(text) ||
    !Array.isArray(v.highlights) ||
    !v.highlights.every(text) ||
    !Array.isArray(v.topics) ||
    !v.topics.every(text)
  )
    throw new FortuneError("INVALID_CHAPTER");
  const allowed = new Set(
    Object.values(input.analysis.contexts).filter(c=>!input.chapter.systems||input.chapter.systems.includes(c.domain)).flatMap((c) =>
      selectChapterFacts(c,input.chapter,input.analysis.topicId).map((f) => f.id),
    ),
  );
  if (
    !Array.isArray(v.sources) ||
    !v.sources.length ||
    v.sources.some((s) => !allowed.has(s))
  )
    throw new FortuneError("INVALID_EVIDENCE");
  if (
    input.previous.some(
      (p) => p.summary === v.summary || p.example === v.example,
    )
  )
    throw new FortuneError("DUPLICATE_CHAPTER");
  validateReadingQuality(v,input.chapter,input.previous);
  return v;
}
export class MockChapterProvider implements FortuneChapterProvider {
  readonly receipt = { provider: "mock", model: "chapter-fixture-v2" };
  constructor(private failAt?: string) {}
  async generateChapter(input: ChapterRequest): Promise<ChapterBody> {
    const c = input.chapter;
    if (this.failAt === c.id) throw new FortuneError("MOCK_CHAPTER_FAILURE");
    const facts = Object.values(input.analysis.contexts).filter(c=>!input.chapter.systems||input.chapter.systems.includes(c.domain)).flatMap(
      (c) => selectChapterFacts(c,input.chapter,input.analysis.topicId),
    );
    if(c.version===READING_VERSION)return mockReading(input,facts.map(f=>f.id));
    const f = facts[c.ordinal % facts.length];
    return validateChapter(
      {
        summary: `${c.title}: 내 선택의 기준을 한 가지씩 확인해 보는 장입니다.`,
        analysis: [
          `이 문장은 ${c.title} 화면과 저장 흐름을 확인하는 모의 해설입니다. 실제 개인 해석이 아닙니다.`,
          `계산 근거 ${f.label}를 연결했습니다. 실제 해설은 제공된 사실과 제약을 함께 설명하도록 구성되어 있습니다.`,
        ],
        example: `${c.title}을 살펴볼 때는 최근 한 달의 경험 중 이 주제와 관련한 장면을 적어 보세요.`,
        advice: `오늘은 '${c.title}'에 관해 바꿀 수 있는 행동 하나만 정해 보세요.`,
        highlights: [`${c.title}의 관찰과 행동을 구분하기`],
        sources: [f.id],
        persona: `${c.title}, 결론보다 네 선택을 먼저 보자냥.`,
        topics: [c.title],
      },
      input,
    );
  }
}
// Long fixtures exercise pagination/length contracts only; they are not personal readings.
function mockReading(input:ChapterRequest,sources:string[]):ChapterBody {
 const c=input.chapter;
 const scenes=['새 일을 시작하기 전 기준을 적는 순간','예상과 다른 말을 듣고 답을 고르는 순간','작은 지출이 겹쳐 우선순위를 살피는 순간','가까운 사람과 서로의 기대를 확인하는 순간','혼자 쉬는 시간과 함께하는 시간을 나누는 순간','익숙한 방식 대신 다른 순서를 시도하는 순간','좋아하는 일과 잘하는 일을 구별하는 순간','결정을 미루는 이유를 돌아보는 순간','도움을 요청할 범위를 정하는 순간','작은 성과를 다음 계획에 반영하는 순간','부담이 커지기 전에 속도를 낮추는 순간','다른 해석도 가능하다는 점을 확인하는 순간'];
 const situations=['빈 공책 앞에서 좋아하는 것과 피하고 싶은 것을 각각 적어 보는 장면','처음 만나는 모임에서 말하기 전 주변 분위기를 살피는 장면','쉬는 날 약속을 잡을지 혼자 시간을 보낼지 생각하는 장면','낯선 도구를 배우면서 쉽게 익히는 부분을 발견하는 장면','여러 부탁이 한꺼번에 들어왔을 때 순서를 나누는 장면','호감을 표현하려다가 어떤 말이 편안할지 고르는 장면','친구와 함께 여행 일정을 정하면서 서로의 기대를 듣는 장면','약속한 연락 시간이 달라 오해를 풀 방법을 찾는 장면','생활 습관이 다른 두 사람이 공동 규칙을 적는 장면','혼자 끝내기 어려운 일에 필요한 도움을 구하는 장면','업무 목록에서 잘하는 역할을 골라 담당하는 장면','조용한 공간과 활기찬 공간 중 집중할 곳을 고르는 장면','스스로 만든 결과물을 다른 사람에게 설명하는 장면','한 달 기록에서 충동적으로 쓴 항목을 되돌아보는 장면','새로운 제안을 받고 현재 계획과 비교하는 장면','일을 마친 뒤 휴식 시간을 따로 확보하는 장면','방을 정리하면서 계속 가지고 있을 물건을 고르는 장면','부족하게 느끼던 조건을 어떤 지원으로 보완할지 적는 장면','여러 방향에서 받은 의견을 종이에 펼쳐 놓는 장면','큰 그림과 작은 단서를 나란히 비교하는 장면','서로 다른 욕구가 생긴 이유를 차분히 확인하는 장면','지금 맡은 책임과 다음 단계의 준비를 구분하는 장면','변화가 다가오기 전 미리 정리할 일을 찾아보는 장면','달력에 예정된 일과 아직 확정되지 않은 일을 표시하는 장면','짧은 질문 한 줄에서 정말 알고 싶은 부분을 찾는 장면','두 가지 경로의 장점과 부담을 나란히 적어 보는 장면','일치하는 설명과 서로 다른 설명을 구별하는 장면','오늘 할 일 한 가지와 나중에 점검할 질문을 정하는 장면'];
 const situation=situations[c.ordinal%situations.length];
 const blocks=(c.requiredSections||['해석','선택']).map(title=>({title,paragraphs:[] as string[]}));
 const target=c.targetChars?.[0]||1000;
 let size=0,j=0;
 while(size<target){
  const scene=scenes[(c.ordinal*3+j)%scenes.length];
  const section=blocks[j%blocks.length];
  const text=`${c.title}의 ${section.title}을 확인하는 모의 해설입니다. ${scene}을 가정하되, 실제 사용자의 경험으로 판정하지 않습니다. ${section.title}의 검증 사례 ${j+1}에서 다룰 질문은 '${c.title}에서 어떤 선택 기준을 확인할 수 있는가'입니다. ${situation}을 중심으로 검증 장면 ${c.ordinal+1}-${j+1}에서는 관찰한 사실과 아직 확인하지 않은 추측을 따로 적습니다. ${scene}의 선택도 환경과 상대의 의사에 따라 달라질 수 있으므로 ${section.title}의 결론을 모든 상황에 적용하지 않습니다. ${situation}과 ${scene}에 떠오르는 선택을 두 개 적고, ${section.title}에 필요한 정보가 무엇인지 비교하는 연습을 합니다. ${scene}을 다룬 이 문단은 문장 품질이나 운세 적중을 입증하는 결과가 아니라, '${c.title}'에서 ${section.title}의 분량과 저장·독서 화면을 검사하기 위한 자료입니다.`;
  const sentences=text.split(/(?<=[.!?])\s+/);for(let k=0;k<sentences.length;k+=2)section.paragraphs.push(sentences.slice(k,k+2).join(' '));size+=text.length;j++;
 }
 for(const section of blocks)if(!section.paragraphs.length)section.paragraphs.push(`${c.title}에서 ${section.title}을 확인합니다. ${section.title} 구간은 ${situation}을 다루는 모의 검증 자료이며, 근거를 실제 개인의 경험으로 바꾸지 않습니다.`);
 const value:ChapterBody={summary:`${c.title} · 모의 상담 구성 확인`,analysis:[],blocks,example:`${c.title}의 사례: ${scenes[c.ordinal%scenes.length]}에 무엇을 확인할지 적어 보는 가상 연습입니다.`,advice:`${c.title}의 실행: 판단에 필요한 정보와 확인할 질문을 나누고, 이번 장의 선택 기준을 한 문장으로 기록합니다.`,highlights:[c.title],sources:sources.slice(0,2),persona:'이 화면은 모의 상담이야. 실제 해석과는 구분해서 살펴봐.',topics:[c.title]};
 return validateChapter(value,input);
}
const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "analysis",
    "example",
    "advice",
    "highlights",
    "sources",
    "persona",
    "topics",
  ],
  properties: Object.fromEntries(
    [
      "summary",
      "analysis",
      "example",
      "advice",
      "highlights",
      "sources",
      "persona",
      "topics",
    ].map((k) => [
      k,
      ["analysis", "highlights", "sources", "topics"].includes(k)
        ? { type: "array", items: { type: "string" } }
        : { type: "string" },
    ]),
  ),
};
export class StructuredChapterProvider implements FortuneChapterProvider {
  receipt?: { provider: string; model: string };
  constructor(private provider: LLMProvider) {}
  async generateChapter(input: ChapterRequest) {
    const named = Object.entries({
      saju: "사주가 말하는",
      ziwei: "자미두수가 말하는",
      sukuyo: "숙요가 말하는",
      vedic: "베다점이 말하는",
    }).find(([, title]) => input.chapter.title.startsWith(title))?.[0];
    const timeTheme =
      input.chapter.theme === "timing" ||
      /시기|전환|흐름|년/.test(input.chapter.title);
    const contexts = Object.values(input.analysis.contexts)
      .filter((c) => input.chapter.systems?input.chapter.systems.includes(c.domain):!named || c.domain === named)
      .map((c) => ({
        ...c,
        facts: selectChapterFacts(c,input.chapter,input.analysis.topicId).filter(
          (f) =>
            timeTheme ||
            input.chapter.theme === "cross" ||
            input.chapter.theme === "action" ||
            !/Luck|Timeline|dasha|transit/i.test(f.label),
        ),
      }));
    const combined: DomainContext = {
      domain: contexts[0].domain,
      engineVersion: contexts.map((c) => c.engineVersion).join("|"),
      calculatedAt: "",
      facts: contexts.flatMap((c) => c.facts),
      limitations: contexts.flatMap((c) => c.limitations),
    };
    // Keep original numeric/symbolic facts, omit duplicated prose and unrelated
    // lifetime triggers from chapters that are not about timing.
    combined.facts=combined.facts.map(f=>{
      if(f.label!=='advancedFactors'||!f.value||typeof f.value!=='object')return f;
      const value=f.value as Record<string,unknown>;
      const rows=Array.isArray(value.earthStorageOpenings)?value.earthStorageOpenings:[];
      return {...f,value:{...value,promptConfig:undefined,earthStorageOpenings:rows.filter(r=>timeTheme||['cross','action'].includes(input.chapter.theme)||r.timingType==='natal').map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['summaryForPrompt','sourceBranchKorean','triggerBranchKorean'].includes(k))))}};
    });
    const tier = input.chapter.tier || input.chapter.id.split("-")[0];
    const depth = (
      {
        mackerel: "핵심 근거 1~2개와 구체적 조언. 분석 문단 2개.",
        salmon: "반복 패턴의 원인과 상황별 차이까지. 분석 문단 3개.",
        flounder:
          "생애 맥락과 실행 전략, 제공된 기간과 같은 체계 안의 다른 신호까지. 분석 문단 3~4개.",
        tuna: "이 챕터 고유 논점을 깊게. 체계별 근거, 다른 가능성, 생활 사례, 실행 기준. 이전 챕터와 같은 예시를 쓰지 않는다. 분석 문단 4~6개.",
      } as Record<string, string>
    )[tier] || "전문 교차분석. 공통 근거와 상충을 구분하고 실행 기준까지 4~6개 문단으로 설명한다.";
    const facts = explanationFacts(combined) as DomainContext;
    if (JSON.stringify(facts).length > 180000)
      throw new FortuneError("CHAPTER_CONTEXT_TOO_LARGE", 503);
    const response = await this.provider.generate({
      system: `${fortuneMaster}\n${persona}`,
      domainRules: JSON.stringify({
        depth: input.chapter.requiredSections?.join(' → ') || depth,
        lengthContract: input.chapter.version===READING_VERSION?{minimum:input.chapter.minimumChars,target:input.chapter.targetChars,unit:'공백 포함 실제 해설 본문. 제목·목차·요약·배지·출처·반복 안내 제외. 분량을 반복으로 채우지 않는다.'}:undefined,
        correction: input.repair,
        excludedSubjects: input.chapter.excludes,
        paidScope: input.chapter.version===READING_VERSION&&!['tuna','assorted','omakase'].includes(tier)?'용신·희신·대운·마하다샤·안타르다샤·삼방사정 전문 해석 금지. 명식의 일반 해석만 한다.':undefined,
        evidenceLimit: '자료 부족은 낮은 위험이나 좋은 운이 아니다. 없는 시기와 사실은 만들지 않는다. 질병·장기 이상·음식의 치료 효능을 명식으로 판단하지 않는다.',
        blockContract: input.chapter.version===READING_VERSION?'blocks는 requiredSections의 모든 제목을 그대로 사용하고 문단당 500자 이하의 짧은 해설 문단을 담는다. analysis는 빈 배열. example과 advice는 blocks를 반복하지 않는 사례와 실행이다.':undefined,
        narrativeTask: input.chapter.version!==READING_VERSION&&tier==='mackerel'?[
          '첫인상만 다룬다. 말이나 일을 시작하기 전에 무엇을 관찰하는 사람인지 한 가지 장면으로 보여준다. 책임 분배 조언은 하지 않는다.',
          '내면의 선택 기준만 다룬다. 두 선택지 사이에서 마음이 움직이는 기준과 그 반대 가능성을 설명한다. 첫인상과 책임 분배를 재설명하지 않는다.',
          '강점이 유용해지는 조건만 다룬다. 막연한 칭찬 대신 어떤 방식으로 강점을 써볼지 보여준다. 앞선 성격 소개를 반복하지 않는다.',
          '부담의 조기 신호만 다룬다. 알아차릴 징후와 멈추는 기준에 집중한다. 다른 장의 성공 사례를 재사용하지 않는다.',
          '오늘 해볼 작은 실험만 다룬다. 앞의 해설을 재탕하지 말고 시작 행동, 실행 문장 하나, 하루 뒤 확인 질문을 준다.',
        ][input.chapter.ordinal]:`이번 장의 고유 질문 '${input.chapter.focus||input.chapter.title}'에만 답한다.`,
        exampleScene: input.chapter.version!==READING_VERSION&&tier==='mackerel'?[
          '대화를 시작하기 전 상대의 말투를 듣는 짧은 순간',
          '할 일 목록에서 두 항목의 순서를 고르는 순간',
          '복잡한 생각을 메모 한 장으로 정리하는 순간',
          '예상치 못한 부탁을 받고 바로 대답하지 않는 순간',
          '하루를 마치며 내일 하지 않을 일을 한 줄 적는 순간',
        ][input.chapter.ordinal]:undefined,
        writingContract:'previousConclusions와 previousExamples는 재사용 금지 목록이다. 기존 문장을 단어만 바꾸어 쓰지 않는다. exampleScene은 가상의 예시 소재이지 실제 경험의 증거가 아니다. 질문과 맞지 않으면 다른 장면을 고른다. 실제 직업이나 동료가 있다고 단정하지 않는다. summary는 이번 장만의 결론으로 쓴다.',
        topic:input.analysis.topicId,
        periodScope:input.chapter.periodScope,
        independence:"같은 천문 관측을 공유하는 숙요·베다·점성술은 독립된 세 증거가 아니다. 타로는 질문 당시 상징이며 천문 사실의 교차검증 수에 포함하지 않는다. 근거 일치도는 적중 확률이 아니다.",
        domain: contexts.map((c) => domainRules[c.domain]),
        task: taskRules[input.chapter.theme],
        chapter: input.chapter,
        previousTopics: input.previous.flatMap((p) => p.topics),
        previousConclusions: input.previous.map((p) => p.summary.slice(0, 150)),
        previousExamples: input.previous.map((p) => p.example.slice(0, 100)),
        themes: input.chapter.version===READING_VERSION ? undefined : input.analysis.themes,
      }),
      calculatedData: facts,
      userQuestion: input.analysis.question||"",
      outputSchema: {...schema,required:input.chapter.version===READING_VERSION?[...schema.required,"blocks"]:schema.required,properties:{...schema.properties,...(input.chapter.version===READING_VERSION?{blocks:{type:"array",minItems:2,maxItems:8,items:{type:"object",additionalProperties:false,required:["title","paragraphs"],properties:{title:{type:"string"},paragraphs:{type:"array",minItems:1,items:{type:"string"}}}}}}:{}),sources:{
        type:'array',minItems:1,
        description:'해석에 실제 사용한 FortuneFact.id만 그대로 선택한다. 괄호, 설명, 번역을 덧붙이지 않는다.',
        items:{type:'string',enum:facts.facts.map(f=>f.id)},
      }}},
      sectionTitles: [input.chapter.title],
      promptVersion: input.chapter.version===READING_VERSION?PROMPT_VERSION:input.chapter.systems?"chapter-v3":"chapter-v2",
      maxOutputTokens:input.chapter.outputTokens,
    });
    this.receipt = { provider: response.provider, model: response.model };
    let candidate:any=response.result;
    if(typeof candidate==='string'){try{candidate=JSON.parse(candidate);}catch{/* The existing result validator handles malformed JSON. */}}
    if(candidate&&typeof candidate.example==='string'&&input.previous.some(p=>repeatedPassage(candidate.example,p.example)))throw new FortuneError('DUPLICATE_CHAPTER');
    return response.result;
  }
}
