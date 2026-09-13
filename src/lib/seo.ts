import type { Metadata } from "next";
import { domainEntries, domainRegistry, type DomainId } from "@/data/domain-registry";
import { getProduct } from "../../server/payments/catalog";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://soulcat.pages.dev";
export const siteName = "사주보는 고양이 영냥이";

export type SeoRoute = {
  slug: string;
  path: `/${string}/`;
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
};

const starterPrice = (domain: DomainId) =>
  getProduct(domainRegistry[domain].paidEntry.starterProductId).priceKRW;
const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const domainRoute = (domain: DomainId): SeoRoute => {
  const entry = domainRegistry[domain];
  const price = starterPrice(domain);
  return {
    slug: entry.slug,
    path: `/${entry.slug}/`,
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

export const seoRoutes = [
  {
    slug: "free-fortune",
    path: "/free-fortune/",
    title: "무료운세 · 영냥이와 오늘의 흐름 보기",
    description:
      "사주, 숙요점, 자미두수, 베다점, 점성술, 타로를 부담 없이 살펴보는 무료운세 입구입니다.",
    keywords: ["무료운세", "오늘의 운세", "영냥이", "사주", "타로"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent:
      "처음 방문한 사용자가 결제 전에 질문의 결을 정리하고 자신에게 맞는 운세 체계를 고르도록 돕습니다.",
    ctaHref: "/fortune/",
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
    path: "/1000-won-fortune/",
    title: `${won(starterPrice("saju"))} 운세 · 영냥이 단건 상담`,
    description:
      "서버 상품 카탈로그 기준의 1000원 단건 운세입니다. 사주, 숙요점, 자미두수, 베다점, 점성술, 타로 중 한 분야를 골라 시작합니다.",
    keywords: ["1000원 운세", "천원 운세", "단건 결제 운세", "영냥이"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent:
      "낮은 금액의 단건 운세를 찾는 방문자에게 가격 원천과 상담 범위를 투명하게 안내합니다.",
    ctaHref: "/fortune/?fish=mackerel",
    ctaLabel: "1000원 단건 운세 시작하기",
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
        question: "월정석이나 이용권이 자동 적용되나요?",
        answer:
          "영냥이 상담은 별도 단건 상품으로 안내되며, 기존 이용권·월정석 구조를 임의로 바꾸지 않습니다.",
      },
    ],
  },
  {
    slug: "yeongnyangi",
    path: "/yeongnyangi/",
    title: "영냥이 · 사주보는 고양이의 달빛 점술방",
    description:
      "흰 고양이 영냥이가 운영하는 보랏빛 점술방입니다. 무료운세부터 단건 상담까지 과장 없는 운세 경험을 제공합니다.",
    keywords: ["영냥이", "사주보는 고양이", "운세 상담", "무료운세"],
    includeInSitemap: true,
    jsonLdType: "FAQPage",
    intent:
      "브랜드명을 검색한 방문자가 영냥이의 세계관과 실제 이용 가능한 운세 입구를 바로 이해하도록 돕습니다.",
    ctaHref: "/room/",
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
] as const satisfies SeoRoute[];

export const seoRouteBySlug = new Map(seoRoutes.map((route) => [route.slug, route]));
export const indexablePaths = new Set(["/", "/fortune/", "/room/", ...seoRoutes.map((r) => r.path)]);
export const privateNoIndexPaths = new Set(["/library/"]);

export function absoluteUrl(path = "/") {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
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
    },
    twitter: {
      card: "summary_large_image",
      title: route.title,
      description: route.description,
    },
  };
}

export function faqJsonLd(route: SeoRoute) {
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
