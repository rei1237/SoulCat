import { safeReturnPath } from './return-path';
export const serviceLinks = [
  { label: "영냥이 홈", href: "/" },
  { label: "운세 보기", href: "/fortune/" },
  { label: "무료운세", href: "/free-fortune/" },
  { label: "1000원 운세", href: "/1000-won-fortune/" },
  { label: "영냥이의 방", href: "/room/" },
  { label: "영냥이 보관함", href: "/library/" },
  { label: "기존 상담", href: "/fortune-tea-house/" },
  { label: "기존 보관함", href: "/?action=dpOpenList" },
  { label: "기존 이용권", href: "/points/" },
  { label: "고객센터", href: "/contact/" },
  { label: "이용약관", href: "/terms/" },
  { label: "개인정보처리방침", href: "/privacy/" },
  { label: "환불·취소", href: "/refund/" },
] as const;

export function loginHref(returnTo: string) {
  return `/login/?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
