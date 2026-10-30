import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address.");

export const newsletterRequestSchema = z
  .object({
    email: emailSchema,
    dropsConsent: z.literal(true, { message: "Consent to receive Nullworx Drops is required." }),
    premiumMarketing: z.boolean().default(false),
    company: z.string().max(200).optional().default(""),
  })
  .strict();

export type NewsletterRequest = z.infer<typeof newsletterRequestSchema>;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
