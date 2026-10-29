import { z } from "zod";

export const EFFECT_STATUSES = ["EXPERIMENTAL", "OWNER_REVIEW", "APPROVED", "RELEASED"] as const;
export type EffectStatus = (typeof EFFECT_STATUSES)[number];

export const FRAMEWORKS = ["React 19", "Next.js 16", "WebGL 2"] as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 digest");

const configFieldSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("range"),
    key: z.string().min(1),
    label: z.string().min(1),
    description: z.string().min(1),
    default: z.number(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
  }),
  z.object({
    type: z.literal("select"),
    key: z.string().min(1),
    label: z.string().min(1),
    description: z.string().min(1),
    default: z.string(),
    options: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
  }),
  z.object({
    type: z.literal("toggle"),
    key: z.string().min(1),
    label: z.string().min(1),
    description: z.string().min(1),
    default: z.boolean(),
  }),
]);

const sourceFileSchema = z.object({
  path: z.string().min(1),
  sha256: sha256Schema,
  role: z.enum(["component", "style", "renderer", "atlas", "preset", "media"]),
});

const releaseApprovalSchema = z.object({
  approvedBy: z.string().min(1),
  approvedAt: z.iso.date(),
  scope: z.literal("release"),
  evidence: z.string().min(1),
});

export const effectSchema = z
  .object({
    schemaVersion: z.literal("1.1.0"),
    id: z.string().regex(/^nwx-[a-z0-9-]+$/, "Stable IDs use the nwx- prefix"),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    subtitle: z.string().min(1),
    version: z.string().min(1),
    status: z.enum(EFFECT_STATUSES),
    summary: z.string().min(40),
    description: z.array(z.string().min(1)).min(1),
    technicalDescription: z.string().min(40),
    categories: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string().min(1)).min(1),
    frameworks: z.array(z.enum(FRAMEWORKS)).min(1),
    requirements: z.array(z.string().min(1)).min(1),
    sourceComponent: z.string().min(1),
    previewComponent: z.string().min(1),
    sourceFiles: z.array(sourceFileSchema).min(1),
    sourceTreeSha256: sha256Schema,
    sourceTreeHashMethod: z.string().min(20),
    provenance: z.object({
      repository: z.url(),
      upstreamHead: z.string().min(7),
      capturedAt: z.iso.date(),
      sourcePath: z.string().min(1),
      notes: z.array(z.string().min(1)).min(1),
      excluded: z.array(z.string().min(1)),
    }),
    installation: z.object({
      archivePath: z.string().startsWith("/"),
      archiveSha256: sha256Schema.optional(),
      command: z.string().min(1),
      usage: z.string().min(1),
      notes: z.array(z.string().min(1)).min(1),
    }),
    config: z.array(configFieldSchema).min(1),
    performance: z.object({
      summary: z.string().min(1),
      measurements: z.array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
          context: z.string().min(1),
        }),
      ).min(1),
      caveat: z.string().min(1),
    }),
    accessibility: z.object({
      summary: z.string().min(1),
      notes: z.array(z.string().min(1)).min(1),
      reducedMotion: z.string().min(1),
    }),
    license: z.object({
      code: z.string().min(1),
      media: z.string().min(1),
      notes: z.string().min(1),
      urls: z.array(z.url()).min(1),
    }),
    previewMedia: z.object({
      src: z.string().startsWith("/"),
      alt: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    publication: z.object({
      releasedAt: z.iso.date().nullable(),
      updatedAt: z.iso.date(),
    }),
    releaseApproval: releaseApprovalSchema.nullable(),
    relatedSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  })
  .superRefine((effect, context) => {
    if (effect.status === "RELEASED") {
      if (!effect.releaseApproval) {
        context.addIssue({
          code: "custom",
          path: ["releaseApproval"],
          message: "A RELEASED effect requires an explicit release approval record.",
        });
      }
      if (!effect.publication.releasedAt) {
        context.addIssue({
          code: "custom",
          path: ["publication", "releasedAt"],
          message: "A RELEASED effect requires a release date.",
        });
      }
    }

    if (effect.status !== "RELEASED" && effect.releaseApproval) {
      context.addIssue({
        code: "custom",
        path: ["releaseApproval"],
        message: "Release approval may only be recorded when the effect is RELEASED.",
      });
    }

    if (effect.relatedSlugs.includes(effect.slug)) {
      context.addIssue({
        code: "custom",
        path: ["relatedSlugs"],
        message: "An effect cannot relate to itself.",
      });
    }

    if (effect.config.some((field) => field.type === "range" && field.min >= field.max)) {
      context.addIssue({
        code: "custom",
        path: ["config"],
        message: "Range controls require min < max.",
      });
    }
  });

export const effectManifestSchema = z.array(effectSchema).superRefine((effects, context) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const [index, effect] of effects.entries()) {
    if (ids.has(effect.id)) {
      context.addIssue({ code: "custom", path: [index, "id"], message: `Duplicate effect ID: ${effect.id}` });
    }
    if (slugs.has(effect.slug)) {
      context.addIssue({ code: "custom", path: [index, "slug"], message: `Duplicate effect slug: ${effect.slug}` });
    }
    ids.add(effect.id);
    slugs.add(effect.slug);
  }
});

export type EffectManifest = z.infer<typeof effectSchema>;
export type EffectConfigField = EffectManifest["config"][number];
export type EffectSourceFile = EffectManifest["sourceFiles"][number];

export const RELEASE_STATUS_COPY: Record<EffectStatus, { label: string; description: string }> = {
  EXPERIMENTAL: {
    label: "Experimental",
    description: "An idea in motion. It may change, break or disappear without notice.",
  },
  OWNER_REVIEW: {
    label: "Owner review",
    description: "The build exists, but the owner has not approved the art for release.",
  },
  APPROVED: {
    label: "Approved",
    description: "The owner has approved the art. Release checks are still pending.",
  },
  RELEASED: {
    label: "Released",
    description: "Approved, documented, verified and published to the public catalogue.",
  },
};
