import AccountBar from "../components/AccountBar";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-kr/wght.css";
import "@fontsource/nanum-myeongjo/700.css";
import "./globals.css";
import CheckoutRecovery from "@/components/CheckoutRecovery";
import ServiceNavigation from "@/components/ServiceNavigation";
import { absoluteUrl, siteName, siteUrl, starterTitle } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: starterTitle,
  description:
    "달빛이 머무는 작은 점술방. 도도하지만 다정한 고양이 영냥이와 오늘의 한마디, 사주, 타로, 별의 이야기를 만나보세요.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    siteName,
    images: [{ url: absoluteUrl("/_soulcat/assets/og-yeongnyangi.jpg"), width: 1200, height: 630, alt: "천원 운세 · 사주보는 고양이 영냥이" }],
    title: starterTitle,
    description:
      "달빛이 머무는 작은 점술방. 도도하지만 다정한 고양이 영냥이와 오늘의 한마디, 사주, 타로, 별의 이야기를 만나보세요.",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    images: [absoluteUrl("/_soulcat/assets/og-yeongnyangi.jpg")],
    title: starterTitle,
    description:
      "달빛이 머무는 작은 점술방. 도도하지만 다정한 고양이 영냥이와 오늘의 한마디, 사주, 타로, 별의 이야기를 만나보세요.",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#211432",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body><AccountBar/><CheckoutRecovery />{children}<ServiceNavigation /></body>
    </html>
  );
}
