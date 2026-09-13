import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import FortuneLibrary from "@/components/FortuneLibrary";

export const metadata: Metadata = {
  title: "영냥이 보관함",
  description: "영냥이 상담 결과를 다시 확인하는 개인 보관함입니다.",
  alternates: { canonical: absoluteUrl("/yeongnyangi/library/") },
  robots: { index: false, follow: false },
};
export default function LibraryPage() {
  return <FortuneLibrary />;
}
