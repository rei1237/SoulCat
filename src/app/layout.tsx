import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-kr/wght.css";
import "@fontsource/nanum-myeongjo/700.css";
import "./globals.css";
import ServiceNavigation from "@/components/ServiceNavigation";

export const metadata: Metadata = {
  title: "사주보는 영냥이 · 네 운명의 이야기를 읽어줄게",
  description:
    "달빛이 머무는 작은 점술방. 도도하지만 다정한 고양이 영냥이와 오늘의 한마디, 사주, 타로, 별의 이야기를 만나보세요.",
  robots: { index: false, follow: false },
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
      <body>{children}<ServiceNavigation /></body>
    </html>
  );
}
