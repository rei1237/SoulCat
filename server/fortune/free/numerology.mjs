// Extracted from Code Destiny lib/tarot/numerology-tarot.mjs; formulas unchanged.
const NUMEROLOGY_DATA = {
  1: {
    keyword: "시작과 독립",
    symbol: "☀",
    meaning: "새 출발, 자기주도, 리더십, 자존심",
    color: "#FFD700",
  },
  2: {
    keyword: "관계와 감정",
    symbol: "☽",
    meaning: "배려, 기다림, 감수성, 재회, 협력",
    color: "#E2E8F0",
  },
  3: {
    keyword: "표현과 매력",
    symbol: "✦",
    meaning: "소통, 창작, 유혹, 즐거움, 가벼움",
    color: "#FF9BE2",
  },
  4: {
    keyword: "안정과 현실",
    symbol: "◆",
    meaning: "책임, 가족, 기반, 신뢰, 느림",
    color: "#8BC34A",
  },
  5: {
    keyword: "변화와 자유",
    symbol: "⚡",
    meaning: "이동, 갈등, 유혹, 변덕, 사건",
    color: "#FF6B35",
  },
  6: {
    keyword: "사랑과 헌신",
    symbol: "♡",
    meaning: "관계, 결혼, 돌봄, 아름다움, 집착",
    color: "#E91E8C",
  },
  7: {
    keyword: "내면과 비밀",
    symbol: "🔮",
    meaning: "분석, 고독, 영성, 의심, 거리감",
    color: "#9C27B0",
  },
  8: {
    keyword: "성공과 권력",
    symbol: "∞",
    meaning: "돈, 성취, 욕망, 거래, 현실적 판단",
    color: "#FDE68A",
  },
  9: {
    keyword: "완성과 치유",
    symbol: "✧",
    meaning: "정리, 용서, 미련, 영적 성장, 마무리",
    color: "#00BCD4",
  },
  11: {
    keyword: "운명적 직감",
    symbol: "⚡⚡",
    meaning: "강한 직감, 운명적 만남, 예민함, 영감",
    color: "#FF4081",
    isMaster: true,
  },
  22: {
    keyword: "현실화의 마스터",
    symbol: "◈",
    meaning: "큰 그림, 장기 관계, 현실화, 운명의 구조화",
    color: "#FDE68A",
    isMaster: true,
  },
  33: {
    keyword: "치유하는 사랑",
    symbol: "☯",
    meaning: "헌신적 사랑, 깊은 공감, 희생, 영적 사랑",
    color: "#E2E8F0",
    isMaster: true,
  },
};

function toText(value) {
  return String(value || "").trim();
}

function normalizeBirthDate(raw) {
  const text = toText(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return text;
}

function reduceToSingleDigit(num, allowMaster = true) {
  if (allowMaster && (num === 11 || num === 22 || num === 33)) return num;
  if (num <= 9) return num;
  const reduced = String(num)
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
  return reduceToSingleDigit(reduced, allowMaster);
}

function calculateLifePath(birthDate) {
  const normalized = normalizeBirthDate(birthDate);
  if (!normalized) return 9;
  const digits = normalized.replace(/-/g, "").split("").map(Number);
  let sum = digits.reduce((acc, value) => acc + value, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum)
      .split("")
      .reduce((acc, value) => acc + Number(value), 0);
  }
  return sum;
}

function calculatePersonalDay(birthDate, now = new Date()) {
  const normalized = normalizeBirthDate(birthDate);
  if (!normalized) return 9;
  const [, month, day] = normalized.split("-").map(Number);
  const sum = now.getMonth() + 1 + now.getDate() + month + day;
  return reduceToSingleDigit(sum);
}
export {NUMEROLOGY_DATA,calculateLifePath,calculatePersonalDay};
