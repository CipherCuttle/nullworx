# Nullworx Creative Effects Roadmap

**Owner direction recorded:** 2026-10-29  
**Status:** Roadmap / product hypotheses. Not a release authorization or implementation approval.  
**Product:** Nullworx (https://nulllworx.site)  
**Primary platform:** Preserve the current Next.js / React / shadcn UI Forge foundation.  
**Working lineage:** G2 draft PR #1; G3-A stacked draft PR #3 (base: feat/forge-foundation-g2). Both remain unmerged.

## North star

Nullworx is a reuse-first procedural effects foundry: combine maintained open-source rendering libraries with original materials and carefully designed interactions, then deliver portable, production-verifiable compositions. Free individual effects drive discovery; paid curated packs, customer personalization, and commercial exports are commercial hypotheses to test, **not proven demand**.

**Owner creative priorities:**
1. **P0-A: Living Typography** — highest creative and commercial focus.
2. **P0-B: Reactive Signal UI** — co-priority, distinct interaction-oriented effect family.
3. **P2: Procedural Brand Objects** — appealing, but explicitly deferred behind the 2D work.

P0-A and P0-B may run independent *research* in parallel, but implementation must use isolated branches/proofs and not obstruct the existing G3-A acceptance gate.

## Foundation gate F0 — before either priority enters the public catalog

- Complete G3-A.1 owner visual decision, real GPU-backed checks, Firefox/WebKit compatibility evaluation, and targeted repairs where necessary.
- Reconfirm relevant dependency security advisories at implementation time (including the announced November 3, 2026 Next.js release once published).
- Preserve all original UI Forge experiment roots and their WIP; never silently promote review-pending effects.
- Resolve author-owned source licensing and third-party redistribution rights before distributing code.
- Distinguish verified technical pass from owner aesthetic approval.
- Do not merge, deploy, publish packages, charge customers, or send marketing emails without a separate owner authorization.

## P0-A — Living Typography (first build track)

**Creative thesis:** Typography behaves as a procedural material: holographic metal, liquid/chrome, glyph rain, ASCII disintegration and responsive optical movement. The result is a visual identity, not a generic animated heading.

**Target outputs:**
- An editable wordmark/heading that applies at least two materials without stale masks or per-phrase source forks.
- A transformation composition: e.g. chrome wordmark → ASCII/glyph breakup → reform (only if the source material is cleared and the effect can be composed honestly).
- A polished interactive React hero/brand element, with static/reduced-motion representation and documented browser support.
- First commercial hypothesis: customizable motion wordmark or hero composition, supplied as a tested React package; offer bespoke personalization without promising automated video output.

**Reuse-first stack:**
- Existing HoloType, Paper Shaders MeshGradient, G3-A mask/recipe contracts, Motion.
- Existing ASCII Waves and Terminal Rain lineage as candidates only; audit provenance and admission status first.
- Noisemaker: isolated material-engine comparison if it brings a distinctive effect the current stack cannot express; wrap official public APIs, don't rewrite its shader engine.
- Tweakpane: optional **lab-only** parameter controls if it eliminates repeated editor code; do not add to consumer runtime exports by default.

**Bounded proofs:**
- T1: user-editable safe text + two existing materials, preserving font-fit/alpha behavior.
- T2: one genuinely compositional glyph/ASCII transition using existing cleared code, with rollback if it requires per-pair hacks.
- T3: one independent customer-ready React export to a clean Next.js AND Vite consumer.

**Exit gate:** owner visual acceptance; editable text changes produce correct new masks without stale caches; no shader forks; keyboard/accessibility and reduced motion pass; independent consumer install works with explicit exact runtime dependencies and notices; browser/mobile/lifecycle/performance receipts exist. Do not advertise paid exports until T3 works.

**Kill/defer:** if cross-renderer fidelity is misleading, output is generic, license rights are uncertain, or customer packaging needs the entire Nullworx studio.

## P0-B — Reactive Signal UI (second build track)

**Creative thesis:** UI reacts like a living signal, not like a full-screen animation laid behind content. Focus on meaningful state response: phosphor afterglow, controlled scanline/interference, signal interruption, subtle recursive feedback and legible CRT/pixel treatments.

**Target outputs:**
- Real **button**, **card/panel**, and **terminal/notification** surfaces with deliberate hover/focus/active/loading/error transitions.
- One cohesive “Signal / Decay” design system preview, not unrelated effects.
- Commercial hypothesis: a drop-in interactive UI/hero kit for developers or retro/game-adjacent products.

**Reuse-first stack:**
- Existing CRT Material Lab, Motion, SVG/CSS filters, existing accessible React DOM components.
- Hydra: an **isolated experimental lane** for analog feedback and recursive signal textures; check actual license, browser cost, cleanup and capture semantics before adoption.
- PixiJS: only if a specific multi-sprite, particle/disintegration or raster composition demonstrably requires it.
- Noisemaker may supply procedural signal textures if the prototype shows a meaningful advantage.
- Do not build a custom video-synthesis engine or borrow restrictive component source.

**Bounded proofs:**
- S1: CRT/Signal treatments on genuine readable/interactive DOM surfaces with all keyboard and focus states.
- S2: a controlled interference/feedback interaction with an input-driven trigger and reversible steady state; test without Hydra first, then compare an isolated Hydra trial if justified.
- S3: one cohesive, clean-consumer installable Signal UI composition with reduced-motion fallback.

**Exit gate:** no content unselectability, hidden focus, full-screen flashing, uncontrolled feedback, lingering timers/rAF/GPU contexts, or unacceptable mobile behavior. Record real user interactions, contrast, visual review, and measured resource cost; clean consumer verification required for distribution.

**Kill/defer:** if feedback harms legibility, input latency, accessibility or performance, retain the lower-cost native CRT/CSS method instead of adding Hydra.

## P2 — Procedural Brand Objects (later, not discarded)

**Creative thesis:** Personalized three-dimensional chrome/glass/organic logos or objects that react to pointer and motion, suitable for distinctive landing pages and brand assets.

**Do not start until:** at least one P0 effect family produces an independently installable, owner-approved output, and there's evidence of user or customer interest in 3D.

**Research candidates:** Three.js + React Three Fiber versus Three.js + Threlte/Svelte. Compare the **same specimen scene**, lifecycle, visual fidelity, package weight, authoring cost and export practicality. A SvelteKit migration is explicitly **not** part of this lane.

**First proof:** one interactive brand object with meaningful material/lighting/geometry, fallback, measured GPU cost, resize, cleanup and static option. Avoid “rotating demo object” as the success criterion.

**Decision:** defer native 3D package/export, physics, and cross-engine parity until a specific buyer workflow justifies them.

## Shared integration and commercial rules

- **Reuse upstream code via exact pinned dependencies and thin adapters.** Do not build new shader or graphics engines without a failed library proof demonstrating need.
- **Do not import React Bits source into resale-oriented packs** without separate legal clearance; use the design/distribution model as reference only.
- Keep effect metadata, renderer adapters, composition recipes, the studio preview, and distribution/export as separate boundaries.
- Mark experimental/review-pending items truthfully. A working preview does not imply release approval.
- No client-only preview should claim a working standalone source export until a real consumer test proves it.
- Keep open-source/free individual primitives available; validate paid value through cohesive preset packs, personalization and saved implementation time, not through artificial paywalls.
- A customer export must include source, dependencies, usage documentation, notices, versioned recipe and a tested reduced-motion/static path.
- Browser/GPU evidence must identify the actual renderer, not conflate SwiftShader with hardware results.

## Portfolio sequence and gates

| Sequence | Gate | Outcome |
| --- | --- | --- |
| 0 | F0 — G3-A.1 acceptance + security/license review | Verified foundation; no release assumed |
| 1 | T1 — Living Typography editable text, dual materials | Proof of reusable personalized wordmarks |
| 2 | S1 — Reactive Signal UI on three true interactive surfaces | Proof of legible meaningful UI behavior |
| 3 | T2 / S2 — one distinctive transition and one feedback experiment | Creative differentiation; compare external libraries against native control |
| 4 | T3 — first portable React wordmark composition | First potential paid deliverable |
| 5 | S3 — first portable Signal UI composition | Second potential paid deliverable |
| 6 | P2 object-scene feasibility only if demand warrants | Decide R3F vs Threlte; no migration |

Advance one gate at a time with PLAN → CHANGESET → VERIFY → HOSTILE REVIEW → VERDICT. Record reproducible fixtures, screenshots/clips, exact dependencies/licenses, clean-consumer results, performance and rollback. Treat owner aesthetics as a separate gate. Experimental branches can be pushed as draft PRs; **no merge or deployment is authorized by this roadmap**.

## Future research backlog (not commitments)

- OGL: custom GLSL only if Paper/Noisemaker public APIs cannot achieve a required material.
- Web Components/Lit: framework-neutral packaging proof once a React consumer export passes.
- Svelte 5: isolated parameter/editor authoring A/B; keep React as the baseline.
- Svelte Flow / React Flow: node-based editor only after real recipes justify graph authoring.
- Motion Canvas / FFmpeg: video deliverables only after deterministic or documented capture semantics are proven.
- PixiJS: particle/sprite lane; Three.js/Threlte: 3D lane; Rust/WASM only on a measured bottleneck.

## Owner review questions at the next visual checkpoint

- Does Living Typography look distinctive enough to headline Nullworx?
- Does Reactive Signal UI preserve readability and convey useful interaction states?
- Which single finished composition would a buyer actually use or pay to personalize?
- Does any newly researched library offer an unmistakable advantage over the verified native/Paper/Motion baseline?
