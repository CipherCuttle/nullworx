import { z } from "zod";
import { MASK_ALIGNMENTS, MASK_ALPHA_MODES, MASK_FITS } from "./types";

/**
 * Runtime validation for composition data.
 *
 * Recipe params are validated later against the resolved material's own
 * EffectDefinition.params schema. Everything else is validated here, before any
 * mask source is built or any material is mounted.
 */

const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "expected kebab-case id");

const versionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "expected semver");

const titleSchema = z.string().min(1).max(120);

const licenseSchema = z
  .object({
    spdx: z.string().min(1).max(80),
    holder: z.string().min(1).max(160),
    redistribution: z.enum(["allowed", "restricted", "unknown"]),
    notices: z.array(z.string().min(1).max(200)).min(1),
  })
  .strict();

const provenanceSchema = z
  .object({
    origin: z.string().min(1).max(160),
    sourcePath: z.string().min(1).max(240),
    commit: z
      .string()
      .regex(/^[0-9a-f]{7,40}$/)
      .optional(),
    sourceSha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
    notes: z.string().min(1).max(600),
  })
  .strict();

const coordinatesSchema = z
  .object({
    width: z.number().int().min(16).max(8192),
    height: z.number().int().min(16).max(8192),
    preserveAspectRatio: z.literal("xMidYMid meet"),
  })
  .strict();

// SVG path grammar only: no attributes, URLs, entities or markup.
const svgPathDataSchema = z
  .string()
  .min(1)
  .max(6000)
  .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/, "expected SVG path data only");

const svgGeometrySchema = z
  .object({
    kind: z.literal("svg-path"),
    paths: z.array(svgPathDataSchema).min(1).max(16),
    strokes: z.array(svgPathDataSchema).max(16),
    strokeWidth: z.number().min(0).max(64),
    fillRule: z.enum(["evenodd", "nonzero"]),
  })
  .strict();

const textGeometrySchema = z
  .object({
    kind: z.literal("text"),
    text: z
      .string()
      .min(1)
      .max(24)
      .regex(/^[A-Z0-9 .-]+$/, "wordmark is restricted to uppercase, digits, space, dot and hyphen"),
    font: z
      .object({
        cssFamily: z
          .string()
          .min(1)
          .max(240)
          .regex(/^[A-Za-z0-9 "'(),.\-_]+$/, "unsafe CSS font family"),
        variable: z.string().regex(/^--[a-z0-9-]+$/),
        fallback: z
          .string()
          .min(1)
          .max(120)
          .regex(/^[A-Za-z0-9 ,"'_\-]+$/, "unsafe fallback font stack"),
        weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800), z.literal(900)]),
        fit: z.number().min(0.5).max(0.95),
        note: z.string().min(1).max(400),
      })
      .strict(),
  })
  .strict();

const maskBaseSchema = z
  .object({
    id: idSchema,
    version: versionSchema,
    title: titleSchema,
    coordinates: coordinatesSchema,
    aspectRatio: z.number().positive(),
    fit: z.enum(MASK_FITS),
    align: z.enum(MASK_ALIGNMENTS),
    alpha: z.enum(MASK_ALPHA_MODES),
    unsupportedBehavior: z.string().min(1).max(300),
    notes: z.array(z.string().min(1).max(400)).max(8),
    license: licenseSchema,
    provenance: provenanceSchema,
  })
  .strict();

export const maskDefinitionSchema = z
  .discriminatedUnion("kind", [
    maskBaseSchema.extend({ kind: z.literal("svg-path"), geometry: svgGeometrySchema }).strict(),
    maskBaseSchema.extend({ kind: z.literal("text"), geometry: textGeometrySchema }).strict(),
  ])
  .superRefine((mask, ctx) => {
    const expected = mask.coordinates.width / mask.coordinates.height;
    if (Math.abs(mask.aspectRatio - expected) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aspectRatio"],
        message: `aspectRatio ${mask.aspectRatio} does not match viewBox ${mask.coordinates.width}x${mask.coordinates.height}`,
      });
    }
    if (mask.geometry.kind !== mask.kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["geometry", "kind"],
        message: "geometry kind must match the mask kind",
      });
    }
  });

export const maskReferenceSchema = z.object({ id: idSchema, version: versionSchema }).strict();
export const materialReferenceSchema = z.object({ id: idSchema, version: versionSchema }).strict();

export const recipeSchema = z
  .object({
    id: idSchema,
    version: versionSchema,
    title: titleSchema,
    mask: maskReferenceSchema,
    material: materialReferenceSchema,
    params: z.record(z.unknown()),
    playback: z.object({ paused: z.boolean() }).strict(),
    notes: z.string().max(600).optional(),
  })
  .strict();

export const recipeSetSchema = z.array(recipeSchema).min(1);

export type MaskDefinitionInput = z.infer<typeof maskDefinitionSchema>;
