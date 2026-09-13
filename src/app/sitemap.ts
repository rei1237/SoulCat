import type { MetadataRoute } from "next";
import { absoluteUrl, seoRoutes } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/fortune/"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/room/"), lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    ...seoRoutes
      .filter((route) => route.includeInSitemap)
      .map((route) => ({
        url: absoluteUrl(route.path),
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: route.slug === "free-fortune" || route.slug === "1000-won-fortune" ? 0.85 : 0.8,
      })),
  ];
}
