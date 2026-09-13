import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import FortuneExperience from "@/components/FortuneExperience";

export const metadata: Metadata = {
  title: "영냥이 운세 상담 · 사주, 숙요점, 자미두수, 베다점, 점성술",
  description:
    "사주, 숙요점, 자미두수, 베다점, 점성술, 타로 중 지금 궁금한 분야를 골라 영냥이와 상담을 시작합니다.",
  alternates: { canonical: absoluteUrl("/yeongnyangi/fortune/") },
};
export default function FortunePage() {
  return <FortuneExperience />;
}
