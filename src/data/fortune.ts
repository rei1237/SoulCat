import { domainRegistry } from "./domain-registry";

export const fortuneSurfaces = {
 tarot: { name: "타로", title: "지금, 어떤 선택 앞에 있어?", line: "질문과 카드가 보여주는 감정·상황·선택을 함께 읽어볼게. 출생정보는 필요 없어.", choices: [["지금의 선택", "원인·과정·결과의 3카드", "tarot"],["사랑과 관계", "관계의 흐름을 살피는 6카드", "love"]]},
  saju: {
    name: domainRegistry.saju.label,
    title: "네 이야기, 어디부터 볼까?",
    line: "타고난 기질부터 지금의 흐름까지. 궁금한 이야기를 골라봐.",
    choices: [
      ["나의 사주", "기질과 삶의 바탕", "saju"],
      ["연애와 인연", "마음이 움직이는 방식", "love"],
      ["대운의 흐름", "변화가 찾아오는 때", "luck"],
      ["일과 적성", "내 힘이 쓰이는 자리", "work"],
      ["재물의 흐름", "쌓고 지키는 나의 습관", "money"],
    ],
  },
  sukuyo: {
    name: "숙요점 궁합",
    title: "너와 그 사람, 어떤 인연일까?",
    line: "나의 본명숙부터 두 사람의 관계까지, 별이 보여주는 차이를 살펴보자.",
    choices: [
      ["나의 본명숙", "27숙으로 살펴보는 나의 바탕", "sukuyo"],
      ["두 사람의 궁합", "끌림·거리·갈등·관계의 방향", "sukuyo"],
      ["오래 함께하려면", "서로의 속도를 이해하는 법", "love"],
    ],
  },
  vedic: {
    name: domainRegistry.vedic.label,
    title: "마음의 별과 삶의 시간을 읽어봐.",
    line: "라그나와 달의 자리, 다샤의 흐름을 인도 점성술의 관점으로 살펴볼게.",
    choices: [
      ["나의 베다 차트", "라그나·달·나크샤트라", "vedic"],
      ["삶의 시기", "다샤로 읽는 변화의 결", "luck"],
    ],
  },
  astrology: {
    name: domainRegistry.astrology.label,
    title: "네가 태어난 순간의 하늘.",
    line: "태양과 달, 상승점이 함께 그리는 너의 모습. 별자리 하나로 끝내지 않을게.",
    choices: [
      ["나의 별 지도", "감정·욕망·관계의 패턴", "astrology"],
      ["재능과 일", "내가 빛나는 환경", "work"],
    ],
  },
  ziwei: {
    name: domainRegistry.ziwei.label,
    title: "별들이 그린 인생의 방을 열어봐.",
    line: "명궁과 신궁, 삶의 열두 영역을 연결해 네 흐름을 살펴볼게.",
    choices: [
      ["나의 명반", "삶의 중심과 타고난 결", "ziwei"],
      ["일과 재물", "관록궁·재백궁의 연결", "money"],
    ],
  },
} as const;
export type FortuneDomainId = keyof typeof fortuneSurfaces;

export const fortuneLoadingArt = {
 tarot: {image:"loading-default.webp",alt:"카드를 읽는 영냥이",title:"확정한 카드로 네 선택을 살펴보고 있어."},
  default: {
    image: "loading-default.webp",
    alt: "상담 흐름을 살펴보는 영냥이",
    title: "영냥이가 흐름을 정리하고 있어.",
  },
  saju: {
    image: "loading-saju.webp",
    alt: "사주 흐름을 살펴보는 영냥이",
    title: "영냥이가 네 사주의 결을 살펴보고 있어.",
  },
  sukuyo: {
    image: "loading-sukuyo.webp",
    alt: "두 사람의 인연을 살펴보는 영냥이",
    title: "영냥이가 두 사람 사이의 거리를 읽고 있어.",
  },
  vedic: {
    image: "loading-vedic.webp",
    alt: "베다 차트를 짚어보는 영냥이",
    title: "영냥이가 마음의 별자리를 맞춰보고 있어.",
  },
  astrology: {
    image: "loading-astrology.webp",
    alt: "별 지도를 짚는 영냥이",
    title: "영냥이가 태어난 순간의 하늘을 펼치고 있어.",
  },
  ziwei: {
    image: "loading-ziwei.webp",
    alt: "자미두수 명반을 살펴보는 영냥이",
    title: "영냥이가 별들이 그린 방을 하나씩 열고 있어.",
  },
  love: {
    image: "loading-love.webp",
    alt: "마음의 흐름을 들여다보는 영냥이",
    title: "영냥이가 마음이 움직인 자리를 조심스럽게 보고 있어.",
  },
  luck: {
    image: "loading-luck.webp",
    alt: "운의 흐름을 살펴보는 영냥이",
    title: "영냥이가 다가오는 변화의 결을 짚고 있어.",
  },
  work: {
    image: "loading-work.webp",
    alt: "핵심 포인트를 짚는 영냥이",
    title: "영냥이가 네 힘이 쓰일 자리를 정리하고 있어.",
  },
  money: {
    image: "loading-money.webp",
    alt: "재물 흐름을 계산하는 영냥이",
    title: "영냥이가 돈의 흐름과 지키는 힘을 맞춰보고 있어.",
  },
  year: {
    image: "loading-luck.webp",
    alt: "올해의 흐름을 살펴보는 영냥이",
    title: "영냥이가 올해 남은 이야기를 차례로 짚고 있어.",
  },
  relationship: {
    image: "loading-sukuyo.webp",
    alt: "두 사람의 인연을 살펴보는 영냥이",
    title: "영냥이가 낯익은 인연의 실마리를 따라가고 있어.",
  },
} as const;
