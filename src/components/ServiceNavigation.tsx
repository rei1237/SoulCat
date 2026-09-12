"use client";
import { useEffect, useState } from "react";
import { loginHref, serviceLinks } from "@/lib/service-links";

export default function ServiceNavigation() {
  const [login, setLogin] = useState(loginHref("/fortune/"));
  useEffect(() => { setLogin(loginHref(window.location.pathname + window.location.search)); }, []);
  return <footer className="service-navigation">
    <p>Code Destiny · 사주보는 영냥이</p>
    <nav aria-label="Code Destiny 서비스 연결">
      {serviceLinks.map(link => <a key={link.label} href={link.href}>{link.label}</a>)}
      <a href={login}>Code Destiny 로그인</a>
    </nav>
    <p>로그인은 함께 사용해요. 영냥이 상담은 별도 단건 상품이며 기존 이용권·월정석이 적용되지 않아요.</p>
  </footer>;
}
