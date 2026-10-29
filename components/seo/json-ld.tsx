import { SITE_NAME, absoluteUrl, siteOrigin } from "@/lib/site";

function serialise(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data, id }: { data: unknown; id?: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  );
}

export function buildSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteOrigin}/#organization`,
        name: SITE_NAME,
        url: siteOrigin,
        sameAs: ["https://github.com/CipherCuttle/nullworx", "https://github.com/CipherCuttle"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteOrigin}/#website`,
        name: SITE_NAME,
        url: siteOrigin,
        description:
          "An experimental library of procedural visual effects for developers and creative coders.",
        inLanguage: "en",
        publisher: { "@id": `${siteOrigin}/#organization` },
      },
    ],
  };
}

export function buildEffectJsonLd(input: {
  name: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  licenseUrl: string;
  keywords: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: input.name,
    description: input.description,
    url: absoluteUrl(`/effects/${input.slug}`),
    codeRepository: "https://github.com/CipherCuttle/nullworx",
    programmingLanguage: "TypeScript",
    runtimePlatform: "Web browser",
    datePublished: input.publishedAt,
    dateModified: input.updatedAt,
    license: input.licenseUrl,
    keywords: input.keywords.join(", "),
    author: { "@id": `${siteOrigin}/#organization` },
    isPartOf: { "@id": `${siteOrigin}/#website` },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
