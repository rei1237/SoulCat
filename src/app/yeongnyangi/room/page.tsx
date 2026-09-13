import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import YeongnyangRoom from "@/components/YeongnyangRoom";

export const metadata: Metadata = {
  title: "영냥이의 방 · 달빛 점술방",
  description:
    "흰 고양이 영냥이의 보랏빛 점술방에서 고민을 정리하고 오늘의 운세 흐름을 가볍게 살펴보세요.",
  alternates: { canonical: absoluteUrl("/yeongnyangi/room/") },
};
export default function RoomPage() { return <YeongnyangRoom />; }
