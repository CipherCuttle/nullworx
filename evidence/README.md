# Verification evidence

This directory holds generated evidence for the Nullworx V0.1 foundation. It is not the
source of truth; the code, manifest and test commands are. Evidence is committed so the
owner can inspect what was run without reproducing every environment detail.

| Path | Produced by | Meaning |
| --- | --- | --- |
| `logs/verify-2026-10-29.log` | `pnpm verify` | Lint, types, manifest, unit tests, production build, secret scan |
| `logs/playwright-2026-10-29.log` | `pnpm test:e2e` | Production-server browser suite |
| `logs/seo-2026-10-29.log` | `pnpm verify:seo` | Crawlability and metadata checks |
| `logs/source-baseline.log` | `pnpm provenance` | Source experiments unchanged |
| `logs/bundle.log` | `pnpm bundle:effects` | Deterministic review archive |
| `logs/secret-scan.log` | `pnpm check:secrets` | Source and built-client credential scan |
| `logs/dependency-inventory.log` | `node scripts/dependency-inventory.mjs` | Audit/license snapshot |
| `logs/drafts.log` | `pnpm drafts -- --review …` | Internal draft generation |
| `tests/playwright-results.json` | Playwright | Machine-readable browser result |
| `seo/report.json` | `pnpm verify:seo` | 99/99 local SEO checks |
| `provenance/source-baseline.json` | `pnpm provenance` | Before fingerprint |
| `provenance/source-current.json` | `pnpm provenance` | After fingerprint |
| `provenance/preservation.json` | `pnpm provenance` | Before/after comparison |
| `dependencies/` | Dependency inventory | Licenses and audits |
| `screenshots/` | Playwright visual spec | Desktop/mobile UI evidence |
| `screenshots/ascii-waves-lab-field-1440x900.png` | Visual spec | Live field scrolled into view after ready |
| `drafts/` | Draft generator | Internal review copy only |

The screenshots are evidence of the current build, not visual sign-off. The effect is in
`OWNER_REVIEW`; no release approval is implied. No real email was sent, no real subscriber
was collected, no deploy occurred and no search engine indexing was observed.

If a command is re-run, refresh the relevant file and keep the old one only if it is useful
history. Do not hand-edit test results.

> The original experiments under `~/DevHub/experiments/` are read-only source material.
> `provenance/preservation.json` confirms they were not modified by this work.
