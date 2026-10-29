# Analytics and measurement

Status: first-party, cookieless, identity-free event logging. No analytics vendor, no
database sink, no dashboard. The site does not claim traffic, conversion or retention
numbers because none have been measured.

## Event catalog

`POST /api/events` accepts only these names and fields.

| Event | Trigger | Extra fields |
| --- | --- | --- |
| `effect_page_viewed` | Effect page mounts (`EffectPageView`) | `effectSlug`, `location=effect-preview`, `path` |
| `preview_interacted` | First pointerdown, control change or reset on a lab preview | `effectSlug`, `location=effect-preview`, `path` |
| `code_copied` | Successful clipboard copy from a code sample or config control | `effectSlug`, `location=effect-preview`, `path` |
| `source_link_followed` | Click on the source repository link on an effect page | `effectSlug`, `location=effect-preview`, `path` |
| `newsletter_signup_started` | First focus of the Drops email field | `location` (`home`, `drops`, or `effect-preview`), `path` |
| `newsletter_confirmation_completed` | Confirmation page loads with a completed/invalid state check; only completed fires | `location=drops`, `path` |
| `support_link_clicked` | Click on a configured Buy Me a Coffee link | `location=footer` or `effect-preview`, `path` |

Payload type:

```json
{
  "event": "code_copied",
  "path": "/lab/ascii-waves",
  "effectSlug": "ascii-waves",
  "location": "effect-preview"
}
```

Allowed keys are exactly `event`, `path`, `effectSlug`, `location`. The server rejects
unknown keys, unknown event names, overlong values and bodies over 1 KB. The response is
`204` and no-store.

## What is deliberately absent

- raw email address, name or subscriber ID;
- raw IP address in the application event payload;
- user agent, referrer, query string, cookies or local storage identifier;
- free-text fields or custom dimensions;
- cross-site IDs, advertising pixels or fingerprinting;
- client-side error content.

`lib/analytics/client.ts` sends only the allowlisted object; `lib/analytics/events.ts` is
the server-side schema. The server route does not read IP or user-agent headers. It logs
the event plus an ISO timestamp to stdout.

## Privacy implications

The event stream is aggregate/directional. A path plus effect slug could still be
personal data in some contexts when combined with host access logs, so:

- do not add identifiers or free text without a privacy review;
- the host’s ordinary access logs remain under the host’s policy, outside this app;
- define a log-retention window with the host before launch;
- do not treat event counts as unique users, conversions or revenue;
- do not publish metrics that have not been observed.

The public privacy page (`/privacy`) describes this behavior in plain language.

## Configuration and failure behavior

- `NEXT_PUBLIC_ANALYTICS=off` disables the client sender. The API still validates
  requests but no browser events are sent from the app.
- A failed fetch is swallowed; measurement never blocks an interaction.
- There is no retry queue, so ad-blocked or offline events are simply absent.
- The endpoint is public and unauthenticated; like any client beacon, counts can be
  inflated by a determined actor. Use them as rough product signals, not billing data.
- No analytics calls are made during server rendering.

## Verification

Unit tests:

- unknown event names rejected;
- unknown keys (including `email`/`ip`) rejected;
- structured data contains no fabricated ratings/counts.

Playwright:

- accepted event returns 204;
- event with an email field returns 400;
- wrong content type returns 415;
- no third-party cookies are set on the public pages;
- no support link is rendered when `NEXT_PUBLIC_SUPPORT_URL` is absent.

Commands:

```sh
pnpm test -- tests/unit/analytics.test.ts
pnpm test:e2e -- --grep "analytics endpoint"
```

## Future work, gated

A durable analytics store would need: a documented retention period, a data-processing
agreement, a way to honor deletion requests, and a decision about whether path-level
events are pseudonymous. Do not add one merely because the UI has events.
