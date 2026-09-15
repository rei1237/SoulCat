import { AuthEnv } from "./auth";
import type { Place } from "./fortune/shared/contracts";

// Code Destiny 에 저장한 "현재 대표 프로필" 을 영냥이 출생 입력 폼의 초기값으로만 쓴다.
// 저장은 여전히 사용자가 확인·제출한 값으로 SoulCat profiles 에 한다. 프리필은 편의 기능이라 어떤 실패든 null.
export interface BirthPrefill {
  birthDate: string;
  birthTime?: string;
  calendarType: "solar" | "lunar";
  leapMonth: boolean;
  gender?: "male" | "female";
  birthPlace?: Place;
}

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : NaN);
const pad = (n: number) => String(n).padStart(2, "0");

export function prefillFromCdProfile(raw: unknown): BirthPrefill | null {
  const p = raw as { gender?: unknown; birth?: Record<string, unknown>; location?: Record<string, unknown> } | null;
  if (!p || typeof p !== "object" || !p.birth || typeof p.birth !== "object") return null;
  const year = int(p.birth.year), month = int(p.birth.month), day = int(p.birth.day);
  if (!(year >= 1901 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  const birthDate = `${year}-${pad(month)}-${pad(day)}`;
  const calType = p.birth.calType;
  const calendarType = calType === "lunar" || calType === "lunar_leap" ? "lunar" : "solar";
  if (calendarType === "solar") {
    const d = new Date(`${birthDate}T00:00:00Z`);
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== birthDate || d > new Date()) return null;
  } else if (day > 30) return null;
  const hour = int(p.birth.hour), minute = int(p.birth.minute);
  // CD 카드에는 "시간 모름" 표시가 없고 시·분 기본값이 0이다. 00:00 은 모름과 구분할 수 없으니 채우지 않는다.
  const birthTime = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && (hour || minute) ? `${pad(hour)}:${pad(minute)}` : undefined;
  const gender = p.gender === "M" ? "male" : p.gender === "F" ? "female" : undefined;
  // CD 위치 기본값은 빈 label + 서울 좌표다. 사용자가 고른 장소(label 있음)만 채운다.
  const loc = p.location;
  let birthPlace: Place | undefined;
  const label = typeof loc?.label === "string" ? loc.label.trim() : "";
  if (label && typeof loc?.lat === "number" && typeof loc?.lng === "number" && typeof loc?.tz === "string"
    && Number.isFinite(loc.lat) && Number.isFinite(loc.lng) && Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: loc.tz });
      birthPlace = { name: label.slice(0, 240), latitude: loc.lat, longitude: loc.lng, timezone: loc.tz };
    } catch { birthPlace = undefined; }
  }
  return {
    birthDate,
    calendarType,
    leapMonth: calType === "lunar_leap",
    ...(birthTime ? { birthTime } : {}),
    ...(gender ? { gender } : {}),
    ...(birthPlace ? { birthPlace } : {}),
  };
}

export async function currentCdBirthPrefill(request: Request, env: AuthEnv): Promise<BirthPrefill | null> {
  const origin = new URL(request.url).origin;
  const expected = env.APP_ENV === "production" ? "https://code-destiny.com" : "https://staging.code-destiny.com";
  const cookies = (request.headers.get("cookie") || "").split(";").map(v => v.trim()).filter(v => /^(fortune_auth_token|fortune_auth_refresh)=/.test(v));
  if (!cookies.length || !env.AUTH_SERVICE || origin !== expected || env.PUBLIC_ORIGIN !== expected) return null;
  try {
    const response = await env.AUTH_SERVICE.fetch(new Request(`${expected}/api/profile/current`, {
      headers: { cookie: cookies.join("; "), accept: "application/json", "user-agent": request.headers.get("user-agent") || "" },
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    }));
    if (!response.ok) return null;
    const body = await response.json() as { ok?: boolean; degraded?: boolean; profile?: unknown } | null;
    if (!body || body.ok !== true || body.degraded) return null;
    return prefillFromCdProfile(body.profile);
  } catch {
    return null;
  }
}
