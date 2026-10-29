import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, siteOrigin } from "./site";

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
}

const SOCIAL_IMAGE_ALT =
  "Nullworx — an experimental library of procedural visual effects. Prelaunch.";

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
}: PageMetadataOptions): Metadata {
  const isHome = path === "/";
  const socialTitle = isHome ? title : `${title} — ${SITE_NAME}`;
  const canonical = absoluteUrl(path);

  return {
    title: isHome ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: { index: false, follow: false, noimageindex: true },
        }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
        },
    openGraph: {
      type,
      locale: "en_US",
      siteName: SITE_NAME,
      url: canonical,
      title: socialTitle,
      description,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [{ url: absoluteUrl("/twitter-image"), width: 1200, height: 630, alt: SOCIAL_IMAGE_ALT }],
    },
  };
}

export function homeMetadata(): Metadata {
  return {
    ...createPageMetadata({
      title: "Nullworx — Procedural visual effects for the web",
      description:
        "An experimental library of procedural visual effects for developers and creative coders. ASCII fields, living stencils, procedural botanicals and visual materials.",
      path: "/",
    }),
    alternates: { canonical: siteOrigin },
  };
}

// Keep the share/description baseline in one place when adding routes.
export const defaultSocialDescription = SITE_DESCRIPTION;
