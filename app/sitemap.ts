import type { MetadataRoute } from "next";
import { getReleasedEffects } from "@/lib/effects";
import { absoluteUrl, legalUpdated, siteOrigin } from "@/lib/site";

const staticRoutes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/effects", priority: 0.9, changeFrequency: "weekly" },
  { path: "/drops", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/licenses", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(`${legalUpdated}T00:00:00.000Z`);
  const released = getReleasedEffects();

  return [
    ...staticRoutes.map((route) => ({
      url: route.path === "/" ? siteOrigin : absoluteUrl(route.path),
      lastModified: updated,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...released.map((effect) => ({
      url: absoluteUrl(`/effects/${effect.slug}`),
      lastModified: new Date(`${effect.publication.updatedAt}T00:00:00.000Z`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
