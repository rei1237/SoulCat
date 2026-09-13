import { safeReturnPath } from './return-path';

export type SocialProvider = "google" | "naver" | "kakao";

export function codeDestinyOrigin() {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "code-destiny.com") return "https://code-destiny.com";
    if (window.location.hostname === "staging.code-destiny.com") return "https://staging.code-destiny.com";
  }
  return (process.env.NEXT_PUBLIC_CODE_DESTINY_ORIGIN || "https://staging.code-destiny.com").replace(/\/$/, "");
}

export const mainServiceLinks = [
  { label: "영냥이 홈", href: "/yeongnyangi/" },
  { label: "운세 보기", href: "/yeongnyangi/fortune/" },
  { label: "영냥이의 방", href: "/yeongnyangi/room/" },
  { label: "꿀꿀 운세", href: "/yeongnyangi/ggulggul-fortune/" },
] as const;

export const legalLinks = [
  { label: "이용약관", href: "/yeongnyangi/terms/" },
  { label: "개인정보처리방침", href: "/yeongnyangi/privacy/" },
  { label: "환불·취소", href: "/yeongnyangi/refund/" },
  { label: "고객센터", href: "/yeongnyangi/contact/" },
] as const;

export function loginHref(returnTo: string) {
  const next = safeReturnPath(returnTo);
  const params = new URLSearchParams({ returnTo: next, next, redirect: next });
  return `${codeDestinyOrigin()}/login/?${params.toString()}`;
}

export function socialLoginHref(provider: SocialProvider, returnTo: string, flow: "login" | "signup" = "login") {
  const next = safeReturnPath(returnTo);
  const params = new URLSearchParams({ flow, next });
  return `${codeDestinyOrigin()}/api/auth/oauth/${provider}/start?${params.toString()}`;
}

export function referralHref(placement: string) {
  return `https://code-destiny.com/?${new URLSearchParams({utm_source: "yeongnyangi", utm_medium: "referral", utm_campaign: "1000won", utm_content: placement})}`;
}
export function ggulggulFortuneHref(_path = "/") {
  return referralHref("service-navigation");
}
