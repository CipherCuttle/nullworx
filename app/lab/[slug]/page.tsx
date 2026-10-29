import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EffectPage } from "@/components/effects/effect-page";
import { EffectPageView } from "@/components/analytics/effect-page-view";
import { getLabEffectBySlug, getLabEffects } from "@/lib/effects";
import { createPageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLabEffects().map((effect) => ({ slug: effect.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const effect = getLabEffectBySlug(slug);
  if (!effect) {
    return createPageMetadata({
      title: "Preview not found",
      description: "This lab preview does not exist.",
      path: `/lab/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `${effect.name}, ${effect.subtitle} — Unreleased lab preview`,
    description: `Owner-review preview of ${effect.name}: ${effect.summary} Not released and excluded from the public catalogue.`,
    path: `/lab/${effect.slug}`,
    noIndex: true,
  });
}

export default async function LabEffectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const effect = getLabEffectBySlug(slug);
  if (!effect) notFound();
  return (
    <>
      <EffectPageView effectSlug={effect.slug} />
      <EffectPage effect={effect} mode="lab" />
    </>
  );
}
