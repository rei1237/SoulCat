export const serviceLinks = [
  { label: "Code Destiny 홈", href: "/" },
  { label: "운세 보기", href: "/fortune/" },
  { label: "영냥이의 방", href: "/room/" },
  { label: "기존 상담", href: "/fortune-tea-house/" },
  { label: "영냥이 보관함", href: "/library/" },
  { label: "기존 보관함", href: "/?action=dpOpenList" },
  { label: "기존 이용권", href: "/points/" },
  { label: "고객센터", href: "/contact/" },
  { label: "이용약관", href: "/terms/" },
  { label: "개인정보처리방침", href: "/privacy/" },
  { label: "환불·취소", href: "/refund/" },
] as const;

export function loginHref(returnTo: string) {
  const base = "https://code-destiny.com";
  let target = "/fortune/";
  try {
    const url = new URL(returnTo, base);
    if (returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") &&
      url.origin === base && ["/fortune/", "/room/", "/library/"].includes(url.pathname))
      target = `${url.pathname}${url.search}${url.hash}`;
  } catch { /* Keep the known return destination. */ }
  return `/login/?returnTo=${encodeURIComponent(target)}`;
}
