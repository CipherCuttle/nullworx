import { getEffectStatusCounts, getReleasedEffects } from "@/lib/effects";
import { SITE_DESCRIPTION, absoluteUrl, siteOrigin } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
  const counts = getEffectStatusCounts();
  const released = getReleasedEffects();
  const releasedLines = released.length
    ? released.map((effect) => `- [${effect.name}](${absoluteUrl(`/effects/${effect.slug}`)}): ${effect.summary}`).join("\n")
    : "- None. No effect has passed the release gate yet.";

  const body = `# Nullworx

> ${SITE_DESCRIPTION}

Canonical: ${siteOrigin}
Repository: https://github.com/CipherCuttle/nullworx
Owner: CipherCuttle
Updated: 2026-10-28

Nullworx is a small, independent lab. The public catalogue is gated: an effect
must be explicitly approved for release before it receives an indexable page or
enters the sitemap. The counts below are generated from the typed manifest.

## Public pages

- [Home](${absoluteUrl("/")}): What Nullworx is, the release state, and Drops.
- [Effects](${absoluteUrl("/effects")}): The public catalogue and its release gate.
- [Drops](${absoluteUrl("/drops")}): The optional email newsletter and consent terms.
- [About](${absoluteUrl("/about")}): The project and its principles.
- [Privacy](${absoluteUrl("/privacy")}): Newsletter, analytics and data handling.
- [Licenses](${absoluteUrl("/licenses")}): Code, media and font licensing.

## Release state

- Released: ${counts.released}
- Approved: ${counts.approved}
- Owner review: ${counts.ownerReview}
- Experimental: ${counts.experimental}

${releasedLines}

## AI retrieval policy

Search and retrieval agents may read these public pages. OAI-SearchBot is
explicitly allowed. Model-training crawlers including GPTBot are disallowed by
robots.txt. This file is a navigation aid, not a request to cite, rank or quote
the site in a particular way.

## Technical notes

- Framework: Next.js App Router with server-rendered page content.
- Newsletter: double opt-in through Brevo when configured; V0.1 defaults to
  disabled and includes a local mock adapter for tests.
- No account, checkout, subscriber count or testimonial is presented as real.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
