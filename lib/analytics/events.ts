import { z } from "zod";

export const ANALYTICS_EVENTS = [
  "effect_page_viewed",
  "preview_interacted",
  "code_copied",
  "source_link_followed",
  "newsletter_signup_started",
  "newsletter_confirmation_completed",
  "support_link_clicked",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const analyticsPayloadSchema = z
  .object({
    event: z.enum(ANALYTICS_EVENTS),
    path: z.string().min(1).max(300).optional(),
    effectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).optional(),
    location: z.enum(["home", "effects", "effect-preview", "drops", "footer", "about"]).optional(),
  })
  .strict();

export type AnalyticsPayload = z.infer<typeof analyticsPayloadSchema>;
