import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_EFFECT_ID,
  EFFECT_DEFINITIONS,
  HOLOTYPE_COMMIT,
  HOLOTYPE_SOURCE_SHA256,
  getEffect,
} from "../lib/effects";
import { validateEffectParams } from "../lib/effects/validate";
import type { AnyEffectDefinition } from "../lib/effects/types";

let checks = 0;

function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`PASS ${label}`);
}

const definitions = [...EFFECT_DEFINITIONS] as AnyEffectDefinition[];
const byId = new Map(definitions.map((definition) => [definition.id, definition]));

check("registry has exactly three effects", () => {
  assert.equal(definitions.length, 3);
});

check("effect ids are unique, stable and kebab-case", () => {
  assert.equal(byId.size, definitions.length);
  for (const definition of definitions) {
    assert.match(definition.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

check("versions are semver", () => {
  for (const definition of definitions) {
    assert.match(definition.version, /^\d+\.\d+\.\d+$/);
  }
});

check("default id resolves", () => {
  assert.equal(getEffect(DEFAULT_EFFECT_ID)?.id, DEFAULT_EFFECT_ID);
  assert.equal(getEffect("does-not-exist"), undefined);
});

for (const definition of definitions) {
  check(`${definition.id}: defaults pass the runtime validator`, () => {
    const result = validateEffectParams(definition, definition.defaults);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.data, definition.defaults);
    }
  });

  check(`${definition.id}: preview loader and route are declared`, () => {
    assert.equal(typeof definition.preview.loader, "function");
    assert.match(definition.preview.route, /^\/labs\/effects/);
  });

  check(`${definition.id}: capability claims are internally consistent`, () => {
    assert.equal(definition.capabilities.clientOnly, true);
    assert.equal(definition.capabilities.webgl, definition.technology === "webgl2");
    if (definition.technology === "webgl2") {
      assert.equal(definition.capabilities.resizable, true);
      assert.ok((definition.capabilities.maxPixelCount ?? 0) > 0);
    }
  });

  check(`${definition.id}: reduced-motion and export declarations are valid`, () => {
    assert.ok(["freeze", "static-frame", "reduce", "none"].includes(definition.reducedMotion));
    assert.ok(definition.exportTargets.length > 0);
    for (const target of definition.exportTargets) {
      assert.ok(["react-component", "png-sequence", "webm"].includes(target));
    }
  });

  check(`${definition.id}: license and provenance are declared`, () => {
    assert.ok(definition.license.spdx.length > 0);
    assert.ok(definition.license.holder.length > 0);
    assert.ok(definition.license.notices.length > 0);
    assert.ok(definition.provenance.origin.length > 0);
    assert.ok(definition.provenance.sourcePath.length > 0);
    assert.ok(definition.provenance.notes.length > 0);
  });
}

check("HoloType provenance points at the captured Expansion 02 commit and tree", () => {
  const holotype = byId.get("holotype-foil")!;
  assert.equal(holotype.status, "review-pending");
  assert.equal(holotype.license.redistribution, "restricted");
  assert.equal(holotype.provenance.commit, HOLOTYPE_COMMIT);
  assert.equal(holotype.provenance.sourceSha256, HOLOTYPE_SOURCE_SHA256);
  assert.equal(holotype.reducedMotion, "freeze");
});

check("third-party adapters are pinned and redistributable", () => {
  const paper = byId.get("paper-mesh-gradient")!;
  const motion = byId.get("motion-signal-behavior")!;
  assert.equal(paper.license.spdx, "Apache-2.0");
  assert.equal(paper.license.redistribution, "allowed");
  assert.equal(motion.license.spdx, "MIT");
  assert.equal(motion.license.redistribution, "allowed");
  assert.equal(motion.reducedMotion, "reduce");
});

check("known-invalid parameters are rejected at runtime", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["holotype-foil", { ...(byId.get("holotype-foil")!.defaults as Record<string, unknown>), spectral: 1.4 }],
    ["holotype-foil", { ...(byId.get("holotype-foil")!.defaults as Record<string, unknown>), preset: "not-a-preset" }],
    ["paper-mesh-gradient", { ...(byId.get("paper-mesh-gradient")!.defaults as Record<string, unknown>), speed: -1 }],
    ["paper-mesh-gradient", { ...(byId.get("paper-mesh-gradient")!.defaults as Record<string, unknown>), swirl: 99 }],
    ["motion-signal-behavior", { ...(byId.get("motion-signal-behavior")!.defaults as Record<string, unknown>), mode: "nope" }],
    ["motion-signal-behavior", { ...(byId.get("motion-signal-behavior")!.defaults as Record<string, unknown>), intensity: 2 }],
  ];
  for (const [id, value] of cases) {
    const result = validateEffectParams(byId.get(id)!, value);
    assert.equal(result.ok, false, `${id} accepted invalid params`);
    if (!result.ok) assert.ok(result.issues.length > 0);
  }
});

check("license notices exist on disk", () => {
  for (const path of [
    "THIRD_PARTY_NOTICES.md",
    "third_party/paper-shaders/LICENSE",
    "third_party/paper-shaders/NOTICE",
    "third_party/paper-shaders-core/LICENSE",
    "third_party/paper-shaders-core/NOTICE",
    "third_party/motion/LICENSE.md",
  ]) {
    assert.ok(existsSync(path), `missing ${path}`);
  }
});

const notices = readFileSync("THIRD_PARTY_NOTICES.md", "utf8");
check("third-party notice text contains Paper Shaders, Motion and Apache-2.0", () => {
  assert.match(notices, /@paper-design\/shaders-react@0\.0\.82/);
  assert.match(notices, /motion@14\.7\.1/);
  assert.match(notices, /Apache-2\.0/);
  assert.match(notices, /MIT/);
});

console.log(`\n${checks}/${checks} effect contract checks passed.`);
