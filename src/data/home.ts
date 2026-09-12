export const services = [
  {
    id: "saju",
    name: "사주",
    subtitle: "타고난 나를 만나는 시간",
    description: "생년월일에 담긴 기질과 반복되는 선택을 살펴보는 이야기.",
    image: "saju",
    theme: "운명의 바탕",
    details: [
      "타고난 기질과 오행의 균형",
      "관계와 일에서 반복되는 패턴",
      "나에게 맞는 선택의 방향",
    ],
  },
  {
    id: "tarot",
    name: "타로",
    subtitle: "마음이 망설이는 순간",
    description: "카드의 상징을 따라 지금의 감정과 선택지를 돌아보는 이야기.",
    image: "tarot",
    theme: "마음의 목소리",
    details: [
      "지금 마음이 향하는 곳",
      "관계 속 감정과 거리",
      "내가 선택할 수 있는 다음 행동",
    ],
  },
  {
    id: "ziwei",
    name: "자미두수",
    subtitle: "별에 담긴 인생의 지도",
    description:
      "명반이라는 별의 지도로 삶의 여러 영역과 흐름을 살펴보는 이야기.",
    image: "ziwei",
    theme: "인생의 지도",
    details: [
      "명반으로 살펴보는 나의 성향",
      "삶의 영역별 강점과 과제",
      "변화 앞에서 참고할 방향",
    ],
  },
  {
    id: "astrology",
    name: "점성술",
    subtitle: "나를 비추는 별의 언어",
    description:
      "태어날 때의 행성 배치로 나의 성향과 관계를 돌아보는 서양 점성술.",
    image: "astrology",
    theme: "별의 언어",
    details: [
      "태양과 달로 읽는 나의 모습",
      "관계에서 드러나는 성향",
      "행성의 움직임으로 살펴보는 흐름",
    ],
  },
  {
    id: "vedic",
    name: "베다점",
    subtitle: "오래된 지혜가 건네는 길",
    description: "인도 점성술의 관점으로 기질과 삶의 방향을 살펴보는 이야기.",
    image: "vedic",
    theme: "오래된 지혜",
    details: [
      "라그나: 삶을 마주하는 태도",
      "라시: 마음의 바탕",
      "나크샤트라: 달이 머무는 별자리",
    ],
  },
  {
    id: "sukuyo",
    name: "숙요",
    subtitle: "너와 나, 그 사이의 인연",
    description:
      "태어난 날의 숙과 두 사람의 관계 유형을 통해 인연을 돌아보는 이야기.",
    image: "sukuyo",
    theme: "인연의 결",
    details: [
      "나의 숙이 보여주는 기질",
      "두 사람 사이의 관계 유형",
      "서로의 차이를 이해하는 방법",
    ],
  },
] as const;
export const concerns = [
  {
    id: "love",
    label: "연애",
    icon: "heart",
    ids: ["tarot", "sukuyo"],
    line: "마음이 가는 사람이 있어? 감정과 두 사람의 간격부터 살펴봐.",
  },
  {
    id: "money",
    label: "돈",
    icon: "wallet",
    ids: ["saju", "ziwei"],
    line: "돈 얘기가 궁금하지? 네가 가진 강점부터 차근차근 정리해 봐.",
  },
  {
    id: "marriage",
    label: "결혼",
    icon: "rings",
    ids: ["sukuyo", "saju"],
    line: "오래 함께할 사람이라면, 닮은 점보다 다른 점도 알아두는 게 좋지.",
  },
  {
    id: "work",
    label: "직업",
    icon: "briefcase",
    ids: ["saju", "astrology"],
    line: "남들이 좋다는 일 말고, 네 힘이 자연스럽게 쓰이는 일을 찾아봐.",
  },
  {
    id: "exam",
    label: "시험",
    icon: "book",
    ids: ["saju", "tarot"],
    line: "결과가 걱정돼? 오늘 집중할 수 있는 한 가지부터 정해 봐.",
  },
  {
    id: "someone",
    label: "그 사람",
    icon: "eyes",
    ids: ["tarot", "sukuyo"],
    line: "상대의 마음을 단정할 수는 없어. 지금 보이는 관계의 흐름을 살펴보자.",
  },
  {
    id: "year",
    label: "올해 운세",
    icon: "sparkles",
    ids: ["ziwei", "astrology"],
    line: "아직 남은 이야기가 있잖아. 앞으로의 방향을 천천히 짚어보자.",
  },
] as const;
export const recommendations = [
  {
    title: "마음이 닿는 순간",
    category: "연애운",
    image: "recommend-love",
    target: "tarot",
  },
  {
    title: "나의 재물 흐름",
    category: "재물운",
    image: "recommend-wealth",
    target: "saju",
  },
  {
    title: "올해, 남은 이야기",
    category: "올해 운세",
    image: "recommend-year",
    target: "ziwei",
  },
  {
    title: "낯익은 인연의 비밀",
    category: "인연 이야기",
    image: "recommend-past",
    target: "sukuyo",
  },
];
export const dailyMessages = [
  {
    title: "조금 느려도, 네 속도로.",
    text: "남의 속도에 맞추느라 네 리듬을 잃지는 마. 오늘은 미뤄둔 작은 일 하나만 끝내봐. 그것도 충분히 앞으로 간 거니까.",
    action: "오늘 끝낼 수 있는 작은 일 하나 적기",
  },
  {
    title: "마음을 읽기 전에, 말을 걸어봐.",
    text: "혼자 추측하다 보면 생각이 끝없이 길어지지. 궁금한 게 있다면 부담 없는 안부부터 건네봐. 답을 재촉하지 않는 것도 다정함이야.",
    action: "고마웠던 사람에게 짧게 안부 전하기",
  },
  {
    title: "다 챙기지 않아도 괜찮아.",
    text: "누군가를 배려하는 건 좋은데, 네 몫의 휴식까지 내주지는 마. 잠깐 창밖을 보고 어깨도 좀 펴. …걱정돼서 하는 말은 아니고.",
    action: "하던 일을 잠시 내려놓고 쉬기",
  },
  {
    title: "잘하는 건, 생각보다 가까이 있어.",
    text: "새로운 걸 찾기 전에 네가 꾸준히 해온 일을 돌아봐. 너무 익숙해서 알아채지 못했을 뿐, 그 안에 쓸 만한 강점이 있을 거야.",
    action: "최근에 잘해낸 일 세 가지 적기",
  },
];
export const story = [
  {
    title: "하늘의 비밀을 읽던 사람",
    image: "story-room",
    line: "“……그래서 결국, 다 맞았잖아.”",
    text: "영묘진인. 사람들은 그를 그렇게 불렀다. 운명의 흐름을 읽는 일만큼은 누구에게도 뒤지지 않았다. 그날 밤, 입 밖으로 꺼내서는 안 될 이야기를 하기 전까지는.",
  },
  {
    title: "천기누설의 대가",
    image: "story-curse",
    line: "“그 한마디가, 그렇게 큰 죄였어?”",
    text: "하늘의 비밀을 너무 멀리 읽어버린 밤. 익숙하던 방 위로 낯선 빛이 쏟아졌다. 책장이 흔들리고, 운명을 읽던 손끝이 빛 속으로 사라졌다.",
  },
  {
    title: "거울 속의 낯선 나",
    image: "story-mirror",
    line: "“……야. 내 손 어디 갔어.”",
    text: "눈을 뜨자 발이 네 개였다. 수염도, 꼬리도 생겼다. 달라지지 않은 것은 딱 하나. 여전히 사람들의 운명을 읽을 수 있다는 것.",
  },
  {
    title: "달빛 아래, 다시 문을 열다",
    image: "room-780",
    line: "“흥, 궁금한 거 있으면 앉아.”",
    text: "이름은 이제 영냥이. 자존심은 여전하고, 생선 앞에서는 조금 약해졌다. 그래도 누군가의 힘든 이야기를 듣고 나면, 몰래 한마디를 더 보태는 고양이. 오늘은 네 이야기를 기다린다.",
  },
];
