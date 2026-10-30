import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/downloads/", "/drops/confirmed", "/drops/unsubscribed"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/api/", "/downloads/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/api/", "/downloads/"],
      },
      {
        // Model-training access is a separate owner policy. Search crawlers such
        // as Googlebot and Bingbot remain allowed under the wildcard rule.
        userAgent: ["GPTBot", "Google-Extended", "Applebot-Extended", "CCBot", "ClaudeBot", "Bytespider"],
        disallow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
