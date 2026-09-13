import { referralHref } from "./service-links";
import type { Metadata } from "next";
import { domainEntries, domainRegistry, type DomainId } from "@/data/domain-registry";
import { getProduct } from "../../server/payments/catalog";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://code-destiny.com";
export const starterTitle = `${starterPriceLabel()} 운세 · 사주보는 고양이 영냥이`;
function starterPriceLabel() { const price = getProduct("saju_mackerel").priceKRW; return price === 1000 ? "천원" : `${price.toLocaleString("ko-KR")}원`; }
export const siteName = "사주보는 고양이 영냥이";

export type SeoRoute = {
  slug: string;
  path: `/${string}/`;
  kind?: "seo" | "legal";
  title: string;
  description: string;
  keywords: string[];
  includeInSitemap: boolean;
  jsonLdType: "WebPage" | "FAQPage";
  intent: string;
  ctaHref: string;
  ctaLabel: string;
  sections: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
  legalImage?: string;
  legalHighlights?: { label: string; text: string }[];
};

const starterPrice = (domain: DomainId) =>
  getProduct(domainRegistry[domain].paidEntry.starterProductId).priceKRW;
const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const legalRoutes: SeoRoute[] = [
  {
    slug: "terms",
    path: "/yeongnyangi/terms/",
    kind: "legal",
    title: "이용약관 · 영냥이의 달빛 점술방",
    description:
      "사주보는 고양이 영냥이 서비스 이용 조건, 콘텐츠의 성격, 유료 상품과 문의 기준을 간결하게 안내합니다.",
    keywords: ["영냥이 이용약관", "SoulCat 약관", "운세 서비스 약관"],
    includeInSitemap: true,
    jsonLdType: "WebPage",
    intent:
      "방문자가 영냥이 서비스를 이용하기 전에 콘텐츠 성격, 이용자 책임, 결제 기준과 문의처를 빠르게 확인하도록 돕습니다.",
    ctaHref: "/yeongnyangi/fortune/",
    ctaLabel: "운세 보기",
    legalImage: "room-study",
    legalHighlights: [
      { label: "서비스 성격", text: "운세 콘텐츠는 오락 및 자기 성찰 목적의 참고 정보입니다." },
      { label: "결제 기준", text: "유료 상품은 SoulCat에서 검증한 별도 상품과 결제 조건을 기준으로 안내합니다." },
      { label: "문의", text: "서비스와 권리 요청은 admin@code-destiny.com에서 접수합니다." },
    ],
    sections: [
      {
        title: "서비스 이용",
        body:
          "영냥이는 사주, 타로, 별자리 기반의 해석 콘텐츠와 질문 정리 경험을 제공합니다. 기능은 서비스 안정성, 운영 사정, 검증 상태에 따라 추가되거나 변경될 수 있습니다.",
      },
      {
        title: "콘텐츠의 한계",
        body:
          "운세와 타로 결과는 가능성, 흐름, 선택지를 읽는 참고 콘텐츠입니다. 법률, 의료, 투자, 세무 등 전문 자문을 대체하지 않으며 결과의 정확성이나 특정 미래를 보장하지 않습니다.",
      },
      {
        title: "유료 이용",
        body:
          "유료 상품은 SoulCat 결제 화면에 표시되는 조건을 기준으로 합니다. 꿀꿀 운세의 기존 결제 권리를 자동 적용한다고 안내하지 않으며, 자동 제공·무제한·평생 이용 같은 혜택은 별도 고지가 없는 한 적용되지 않습니다.",
      },
      {
        title: "이용자 책임",
        body:
          "이용자는 본인의 입력 정보를 스스로 확인해야 하며, 타인의 개인정보 도용, 서비스 방해, 무단 자동화 접근, 콘텐츠 무단 복제와 배포를 해서는 안 됩니다.",
      },
    ],
    faq: [
      {
        question: "영냥이 결과는 확정된 예언인가요?",
        answer:
          "아니요. 영냥이의 콘텐츠는 오락 및 자기 성찰 목적의 참고 정보이며, 실제 의사결정에는 사용자의 판단과 필요한 경우 전문가 상담이 우선됩니다.",
      },
      {
        question: "꿀꿀 운세의 결제 권리가 자동 적용되나요?",
        answer:
          "아니요. SoulCat은 꿀꿀 운세와 별도 결제 정책으로 운영합니다. 로그인 흐름은 함께 사용할 수 있지만, 결제 권리는 SoulCat 상품 기준으로 확인합니다.",
      },
    ],
  },
  {
    slug: "privacy",
    path: "/yeongnyangi/privacy/",
    kind: "legal",
    title: "개인정보처리방침 · 영냥이",
    description:
      "영냥이가 어떤 정보를 언제 처리할 수 있는지, 저장되지 않는 현재 기능과 권리 요청 방법을 쉽게 안내합니다.",
    keywords: ["영냥이 개인정보처리방침", "SoulCat 개인정보", "운세 개인정보"],
    includeInSitemap: true,
    jsonLdType: "WebPage",
    intent:
      "방문자가 출생 정보, 결제 정보, 문의 정보가 어떤 목적으로 쓰이는지와 삭제·정정 요청 방법을 확인하도록 돕습니다.",
    ctaHref: "/yeongnyangi/contact/",
    ctaLabel: "개인정보 문의하기",
    legalImage: "night-read",
    legalHighlights: [
      { label: "최소 처리", text: "운세 제공과 문의 응대에 필요한 정보만 처리합니다." },
      { label: "현재 기능", text: "준비 중인 로그인·보관함을 실제 저장 기능처럼 안내하지 않습니다." },
      { label: "권리 요청", text: "열람, 정정, 삭제, 처리 정지는 이메일로 요청할 수 있습니다." },
    ],
    sections: [
      {
        title: "수집 항목과 목적",
        body:
          "운세 기능을 이용할 때 생년월일, 출생시간, 성별, 출생지처럼 해석에 필요한 입력값을 요청할 수 있습니다. 문의 시에는 회신 받을 이메일과 문의 내용을 처리합니다.",
      },
      {
        title: "저장과 보관",
        body:
          "로그인은 기존 Code Destiny 계정으로 확인합니다. 상담에 입력한 정보, 계산 결과, 주문과 상담 결과는 SoulCat 보관함 제공 및 결제 권한 확인을 위해 서버에 저장됩니다.",
      },
      {
        title: "결제와 위탁",
        body:
          "결제 정보는 결제 처리, 환불, 영수증 발행, SoulCat 상품 권한 확인을 위해 결제대행사와 함께 처리될 수 있습니다. 카드번호 전체 같은 민감한 결제 원문은 직접 저장하지 않는 기준을 따릅니다.",
      },
      {
        title: "이용자 권리",
        body:
          "개인정보 열람, 정정, 삭제, 처리 정지, 동의 철회 요청은 admin@code-destiny.com으로 접수할 수 있습니다. 법령상 보관 의무가 있는 거래 기록은 해당 기간 동안 보관될 수 있습니다.",
      },
    ],
    faq: [
      {
        question: "영냥이가 입력한 정보를 항상 저장하나요?",
        answer:
          "로그인 후 상담을 진행하면 입력 정보와 계산·상담 결과가 서버에 저장됩니다. 개인정보 관련 요청은 아래 문의처로 접수할 수 있습니다.",
      },
      {
        question: "개인정보 삭제는 어디로 요청하나요?",
        answer:
          "admin@code-destiny.com으로 열람, 정정, 삭제, 처리 정지 요청을 보낼 수 있습니다.",
      },
    ],
  },
  {
    slug: "refund",
    path: "/yeongnyangi/refund/",
    kind: "legal",
    title: "환불·취소 안내 · 영냥이",
    description:
      "SoulCat 별도 상품 결제의 환불·취소 기준과 결과 미제공, 중복 결제 문의 방법을 안내합니다.",
    keywords: ["영냥이 환불", "SoulCat 취소", "운세 결제 환불"],
    includeInSitemap: true,
    jsonLdType: "WebPage",
    intent:
      "결제 전후 방문자가 청약철회 가능 범위, 디지털 콘텐츠 제공 개시 이후 제한, 문의 방법을 이해하도록 돕습니다.",
    ctaHref: "/yeongnyangi/contact/",
    ctaLabel: "환불 문의하기",
    legalImage: "expressions/thinking",
    legalHighlights: [
      { label: "결제 전", text: "결제 완료 전에는 언제든 취소할 수 있습니다." },
      { label: "제공 개시 후", text: "청약철회 제한은 관계 법령의 요건과 결제 전 안내를 함께 확인합니다." },
      { label: "오류 처리", text: "중복 결제나 결과 미제공은 내역 확인 후 적절히 처리합니다." },
    ],
    sections: [
      {
        title: "기본 기준",
        body:
          "유료 결제 상품은 SoulCat 상품 카탈로그와 결제 화면의 고지를 기준으로 안내합니다. 꿀꿀 운세의 기존 결제 권리를 SoulCat 권리로 자동 전환하지 않습니다.",
      },
      {
        title: "청약철회와 제한",
        body:
          "SoulCat 유료 상품의 청약철회는 관계 법령에 따라 요청할 수 있습니다. 디지털 콘텐츠 제공 개시 후 제한 여부는 사전 고지 등 법령상 요건을 확인하며, 생성이나 열람 사실만으로 일률적으로 거절하지 않습니다.",
      },
      {
        title: "오류와 중복 결제",
        body:
          "결제 후 결과가 제공되지 않았거나 동일 상품의 중복 결제가 확인되면 결제 내역과 오류 기록을 확인한 뒤 재생성, 이용 조정, 부분 환불 또는 전액 환불 중 적절한 방식으로 처리합니다.",
      },
      {
        title: "문의 방법",
        body:
          "환불 요청은 결제자 본인 확인 후 admin@code-destiny.com으로 접수합니다. 실제 카드사와 결제대행사의 반영 시점은 결제수단별 정책에 따라 달라질 수 있습니다.",
      },
    ],
    faq: [
      {
        question: "결제 후 결과를 열람했는데 단순 변심 환불이 가능한가요?",
        answer:
          "결과 열람 여부뿐 아니라 관계 법령상 청약철회 요건을 함께 확인합니다. 오류나 중복 결제도 결제 내역을 기준으로 확인하니 문의처로 요청해 주세요.",
      },
      {
        question: "환불 문의에는 무엇을 적어야 하나요?",
        answer:
          "결제자 확인이 가능한 정보, 결제 시각, 상품명, 문제가 발생한 화면이나 상황을 함께 보내주시면 확인이 빠릅니다.",
      },
    ],
  },
  {
    slug: "contact",
    path: "/yeongnyangi/contact/",
    kind: "legal",
    title: "고객센터 · 영냥이에게 전할 말",
    description:
      "서비스 이용, 결제 내역, 개인정보 요청, 콘텐츠 정정 요청을 Code Destiny 운영 이메일로 접수하는 방법을 안내합니다.",
    keywords: ["영냥이 고객센터", "SoulCat 문의", "Code Destiny 문의"],
    includeInSitemap: true,
    jsonLdType: "WebPage",
    intent:
      "방문자가 문의 유형과 운영 이메일, 사업자 정보를 빠르게 확인하고 필요한 정보만 안전하게 보내도록 안내합니다.",
    ctaHref: "mailto:admin@code-destiny.com",
    ctaLabel: "이메일 보내기",
    legalImage: "expressions/comfort",
    legalHighlights: [
      { label: "운영 이메일", text: "admin@code-destiny.com" },
      { label: "문의 유형", text: "이용, 결제, 개인정보, 콘텐츠 정정 요청을 접수합니다." },
      { label: "주의", text: "비밀번호나 카드번호 전체 등 불필요한 민감정보는 보내지 마세요." },
    ],
    sections: [
      {
        title: "접수하는 문의",
        body:
          "서비스 이용 방법, 화면 오류, 결제 내역 확인, 결과 미제공, 개인정보 열람·정정·삭제·처리정지, 콘텐츠 정정 요청을 접수합니다.",
      },
      {
        title: "보내면 좋은 정보",
        body:
          "문의 유형, 이용한 페이지 주소, 발생 시각, 상품명 또는 결제 시각, 재현 가능한 상황을 적어 주세요. 민감정보와 비밀번호, 카드번호 전체는 보내지 않는 것이 안전합니다.",
      },
      {
        title: "사업자 정보",
        body:
          "상호는 코드 데스티니(Code Destiny), 대표는 박병하입니다. 사업자등록번호는 372-23-02329, 통신판매업 신고번호는 제 2026-화성호-0264 호입니다.",
      },
      {
        title: "연락처",
        body:
          "사업장 주소는 경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호입니다. 전화는 050-6664-7398, 이메일은 admin@code-destiny.com입니다.",
      },
    ],
    faq: [
      {
        question: "문의는 사이트에서 자동 전송되나요?",
        answer:
          "현재 이 페이지는 안내 중심입니다. 이메일 앱이나 사용 중인 메일 서비스에서 admin@code-destiny.com으로 보내 주세요.",
      },
      {
        question: "개인정보 요청도 같은 이메일로 보내면 되나요?",
        answer:
          "네. 열람, 정정, 삭제, 처리 정지 요청도 admin@code-destiny.com에서 접수합니다.",
      },
    ],
  },
];

const domainRoute = (domain: DomainId): SeoRoute => {
  const entry = domainRegistry[domain];
  const price = starterPrice(domain);
  return {
    slug: entry.slug,
    path: `/yeongnyangi/${entry.slug}/`,
    title: `${entry.label} 잘보는 사이트 · 영냥이의 ${entry.label} 상담`,
    description: `${entry.shortDescription} ${won(price)} 단건 상담부터 무료 흐름 확인까지, 영냥이가 과장 없이 읽어드립니다.`,
    keywords: [entry.label, `${entry.label} 잘보는 사이트`, "영냥이", "무료운세", "1000원 운세"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent: entry.seoIntent,
    ctaHref: entry.paidEntry.href,
    ctaLabel: entry.paidEntry.label,
    sections: [
      {
        title: `${entry.label}에서 보는 것`,
        body: entry.shortDescription,
      },
      {
        title: "입력 정보",
        body: `${entry.requiredInput}를 기준으로 상담을 준비합니다. 필요한 정보만 받고, 결과에서는 단정 대신 흐름과 선택지를 중심으로 설명합니다.`,
      },
      {
        title: "무료와 단건 상담의 차이",
        body: `무료운세는 오늘의 질문을 가볍게 정리하는 입구이고, ${won(price)} 단건 상담은 선택한 체계의 핵심 근거와 행동 조언을 더 길게 정리합니다.`,
      },
    ],
    faq: [
      {
        question: `${entry.label} 상담은 무엇을 준비해야 하나요?`,
        answer: entry.requiredInput,
      },
      {
        question: `무료운세와 ${won(price)} 단건 상담은 같은가요?`,
        answer:
          "무료운세는 부담 없이 흐름을 확인하는 체험이고, 단건 상담은 서버 상품 카탈로그에 등록된 상품 기준으로 더 구체적인 리포트를 제공합니다.",
      },
      {
        question: "결과를 100% 확정처럼 말하나요?",
        answer:
          "아니요. 영냥이는 가능성, 반복 패턴, 선택지를 중심으로 설명하며 불안을 키우는 단정 표현을 피합니다.",
      },
    ],
  };
};

export const seoRoutes: SeoRoute[] = [
  ...legalRoutes,
  {
    slug: "ggulggul-fortune",
    path: "/yeongnyangi/ggulggul-fortune/",
    title: "꿀꿀 운세 연결 · 꽃돼지 연이와 영냥이",
    description:
      "Code Destiny의 꿀꿀 운세와 사주보는 고양이 영냥이를 같은 계정 흐름으로 이어 보는 안내 페이지입니다.",
    keywords: ["꿀꿀 운세", "꽃돼지 연이", "Code Destiny", "영냥이"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent:
      "기존 꿀꿀 운세 사용자가 영냥이 상담으로 넘어오거나, 영냥이 사용자가 Code Destiny의 꿀꿀 운세 허브로 이동할 때 로그인과 서비스 관계를 이해하도록 돕습니다.",
    ctaHref: referralHref("service-intro"),
    ctaLabel: "꿀꿀 운세로 이동",
    sections: [
      {
        title: "같은 Code Destiny 계정 흐름",
        body:
          "영냥이는 Code Destiny의 기존 Google, 네이버, 카카오 로그인 흐름으로 세션을 확인합니다. 새 비밀번호 체계를 만들지 않고 기존 계정 경로와 이어집니다.",
      },
      {
        title: "서로 다른 캐릭터, 이어지는 운세",
        body:
          "꽃돼지 연이의 꿀꿀 운세는 가볍게 오늘의 흐름을 살피는 입구이고, 영냥이는 선택한 체계를 더 길게 읽는 상담 경험으로 이어집니다.",
      },
      {
        title: "정책은 그대로 유지",
        body:
          "이 연결은 브랜드와 로그인 흐름을 정리하는 작업입니다. SoulCat 결제는 꿀꿀 운세의 기존 결제 권리와 별개로 검증한 상품 기준만 안내합니다.",
      },
    ],
    faq: [
      {
        question: "꿀꿀 운세 계정으로 영냥이에 로그인하나요?",
        answer:
          "로그인은 Code Destiny의 기존 소셜 로그인 세션을 확인하는 구조를 사용합니다. 다만 결제 권리와 상품 정책은 SoulCat 기준으로 별도 확인합니다.",
      },
      {
        question: "꿀꿀 운세의 결제 권리가 적용되나요?",
        answer:
          "아니요. SoulCat은 꿀꿀 운세와 별도 결제 정책으로 운영하며, 화면에서 검증한 SoulCat 상품만 결제 권리로 안내합니다.",
      },
    ],
  },
  {
    slug: "free-fortune",
    path: "/yeongnyangi/free-fortune/",
    title: "무료운세 · 영냥이와 오늘의 흐름 보기",
    description:
      "사주, 숙요점, 자미두수, 베다점, 점성술, 타로를 부담 없이 살펴보는 무료운세 입구입니다.",
    keywords: ["무료운세", "오늘의 운세", "영냥이", "사주", "타로"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent:
      "처음 방문한 사용자가 결제 전에 질문의 결을 정리하고 자신에게 맞는 운세 체계를 고르도록 돕습니다.",
    ctaHref: "/yeongnyangi/fortune/",
    ctaLabel: "무료운세에서 시작하기",
    sections: [
      {
        title: "가볍게 시작하는 운세",
        body:
          "무료운세는 개인 결과 리포트와 구분된 입구입니다. 오늘의 고민을 짧게 정리하고, 더 깊게 볼 체계를 고르는 데 초점을 둡니다.",
      },
      {
        title: "검색보다 친절한 구조",
        body:
          "사주, 숙요점, 자미두수, 베다점, 점성술, 타로를 한 화면에서 비교하고 필요한 입력 정보가 무엇인지 먼저 확인할 수 있습니다.",
      },
    ],
    faq: [
      {
        question: "무료운세만으로 결제가 발생하나요?",
        answer:
          "아니요. 결제가 필요한 단건 상담은 별도 버튼과 확인 단계를 거칩니다.",
      },
      {
        question: "어떤 운세부터 보면 좋나요?",
        answer:
          "기질과 삶의 흐름은 사주, 관계는 숙요점과 타로, 별자리 기반 성향은 점성술이나 베다점을 추천합니다.",
      },
    ],
  },
  {
    slug: "1000-won-fortune",
    path: "/yeongnyangi/1000-won-fortune/",
    title: `${won(starterPrice("saju"))} 운세 · 영냥이 단건 상담`,
    description:
      `영냥이의 ${won(starterPrice("saju"))} 운세. 내 기질과 반복되는 고민을 읽고, 오늘 해볼 작은 행동까지 한 편의 이야기로 만나보세요.`,
    keywords: ["1000원 운세", "천원 운세", "단건 결제 운세", "영냥이"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent:
      "낮은 금액의 단건 운세를 찾는 방문자에게 가격 원천과 상담 범위를 투명하게 안내합니다.",
    ctaHref: "/yeongnyangi/fortune/?fish=mackerel",
    ctaLabel: `${won(starterPrice("saju"))} 운세 살펴보기`,
    sections: [
      {
        title: "가격은 서버 상품 기준",
        body:
          "1000원 운세는 고등어 단건 상품을 가리키며, 화면 문구는 서버 상품 카탈로그의 가격을 기준으로 표시합니다.",
      },
      {
        title: "무리한 약속 없이",
        body:
          "결제하면 모든 문제가 해결된다는 식의 표현을 쓰지 않습니다. 선택한 한 분야의 핵심 흐름과 현실적인 조언을 정리합니다.",
      },
      {
        title: "원하는 체계 선택",
        body:
          "사주, 숙요점, 자미두수, 베다점, 점성술, 타로 중 지금 질문에 맞는 분야를 고를 수 있습니다.",
      },
    ],
    faq: [
      {
        question: "정말 1000원인가요?",
        answer: `현재 고등어 단건 상품은 서버 상품 카탈로그 기준 ${won(starterPrice("saju"))}입니다. 화면은 이 값을 직접 참조합니다.`,
      },
      {
        question: "꿀꿀 운세의 결제 권리가 자동 적용되나요?",
        answer:
          "아니요. 영냥이 상담은 SoulCat의 별도 상품으로 안내되며, 꿀꿀 운세의 기존 결제 권리를 자동 적용하지 않습니다.",
      },
    ],
  },
  {
    slug: "about",
    path: "/yeongnyangi/about/",
    title: "영냥이 · 사주보는 고양이의 달빛 점술방",
    description:
      "흰 고양이 영냥이가 운영하는 보랏빛 점술방입니다. 무료운세부터 단건 상담까지 과장 없는 운세 경험을 제공합니다.",
    keywords: ["영냥이", "사주보는 고양이", "운세 상담", "무료운세"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent:
      "브랜드명을 검색한 방문자가 영냥이의 세계관과 실제 이용 가능한 운세 입구를 바로 이해하도록 돕습니다.",
    ctaHref: "/yeongnyangi/room/",
    ctaLabel: "영냥이의 방으로 가기",
    sections: [
      {
        title: "도도하지만 다정한 상담",
        body:
          "영냥이는 사용자의 마음을 겁주지 않고, 지금 읽을 수 있는 흐름과 선택지를 차분히 짚어주는 캐릭터입니다.",
      },
      {
        title: "운세 체계는 섞지 않기",
        body:
          "사주, 숙요점, 자미두수, 베다점, 점성술, 타로는 각각의 기준을 유지하며 쉬운 설명으로 번역합니다.",
      },
    ],
    faq: [
      {
        question: "영냥이는 실제 AI 상담인가요?",
        answer:
          "서비스 환경에 따라 mock 또는 준비 중인 기능이 있을 수 있습니다. 실제 LLM과 production 연동은 별도 검증 후 안내합니다.",
      },
      {
        question: "어디서 시작하면 좋나요?",
        answer:
          "처음이라면 무료운세나 영냥이의 방에서 질문을 정리한 뒤, 필요한 분야의 단건 상담으로 이어가면 됩니다.",
      },
    ],
  },
  ...domainEntries.map((entry) => domainRoute(entry.domain)),
];

export const seoRouteBySlug = new Map(seoRoutes.map((route) => [route.slug, route]));
export const indexablePaths = new Set(["/", "/yeongnyangi/fortune/", "/yeongnyangi/room/", ...seoRoutes.map((r) => r.path)]);
export const privateNoIndexPaths = new Set(["/yeongnyangi/library/"]);

export function absoluteUrl(path = "/yeongnyangi/") {
  const route = path === "/" ? "/yeongnyangi/" : path;
  return `${siteUrl}${route.startsWith("/") ? route : `/${route}`}`;
}

export function routeMetadata(route: SeoRoute): Metadata {
  const url = absoluteUrl(route.path);
  return {
    title: route.title,
    description: route.description,
    keywords: route.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName,
      title: route.title,
      description: route.description,
      url,
      images: [{ url: absoluteUrl("/_soulcat/assets/og-yeongnyangi.jpg"), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [absoluteUrl("/_soulcat/assets/og-yeongnyangi.jpg")],
      title: route.title,
      description: route.description,
    },
  };
}

export function faqJsonLd(route: SeoRoute) {
  if (route.jsonLdType === "WebPage") {
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: route.title,
      description: route.description,
      url: absoluteUrl(route.path),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: route.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
