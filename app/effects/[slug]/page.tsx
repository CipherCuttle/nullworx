import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EffectPage } from "@/components/effects/effect-page";
import { EffectPageView } from "@/components/analytics/effect-page-view";
import {
  JsonLd,
  buildBreadcrumbJsonLd,
  buildEffectJsonLd,
} from "@/components/seo/json-ld";
import { getReleasedEffectBySlug, getReleasedEffects } from "@/lib/effects";
import { createPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return getReleasedEffects().map((effect) => ({ slug: effect.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const effect = getReleasedEffectBySlug(slug);
  if (!effect) {
    return createPageMetadata({
      title: "Effect not found",
      description: "This effect is not in the public Nullworx catalogue.",
      path: `/effects/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `${effect.name}, ${effect.subtitle}`,
    description: effect.summary,
    path: `/effects/${effect.slug}`,
    type: "article",
    publishedTime: effect.publication.releasedAt ?? undefined,
    modifiedTime: effect.publication.updatedAt,
  });
}

export default async function PublicEffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const effect = getReleasedEffectBySlug(slug);
  if (!effect || !effect.publication.releasedAt) notFound();

  return (
    <>
      <EffectPageView effectSlug={effect.slug} />
      <JsonLd
        id="effect-jsonld"
        data={buildEffectJsonLd({
          name: `${effect.name}, ${effect.subtitle}`,
          description: effect.summary,
          slug: effect.slug,
          publishedAt: effect.publication.releasedAt,
          updatedAt: effect.publication.updatedAt,
          licenseUrl: effect.license.urls[0] ?? absoluteUrl("/licenses"),
          keywords: effect.tags,
        })}
      />
      <JsonLd
        id="effect-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Effects", path: "/effects" },
          { name: effect.name, path: `/effects/${effect.slug}` },
        ])}
      />
      <EffectPage effect={effect} mode="public" />
    </>
  );
}
