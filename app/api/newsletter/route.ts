import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getNewsletterRuntime } from "@/lib/newsletter/config";
import { normaliseEmail, newsletterRequestSchema } from "@/lib/newsletter/validation";
import { GENERIC_SUBSCRIBE_MESSAGE, type NewsletterApiError, type NewsletterApiSuccess } from "@/lib/newsletter/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

function json<T>(body: T, status: number, extraHeaders: Record<string, string> = {}): NextResponse<T> {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients still face rate limits and consent checks.
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host");
    return Boolean(host) && originUrl.host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) {
    return json<NewsletterApiError>(
      { ok: false, code: "invalid_input", message: "This request could not be accepted." },
      403,
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json<NewsletterApiError>(
      { ok: false, code: "invalid_input", message: "Send a JSON request." },
      415,
    );
  }

  const text = await request.text();
  if (text.length > 4_096) {
    return json<NewsletterApiError>(
      { ok: false, code: "invalid_input", message: "This request could not be accepted." },
      413,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json<NewsletterApiError>(
      { ok: false, code: "invalid_input", message: "This request could not be accepted." },
      400,
    );
  }

  const parsed = newsletterRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return json<NewsletterApiError>(
      {
        ok: false,
        code: "invalid_input",
        message: first?.message || "Check the form and try again.",
      },
      400,
    );
  }

  const requestId = randomUUID();

  // Honeypot: accept silently and do nothing. Do not reveal the tripwire.
  if (parsed.data.company.trim().length > 0) {
    console.info("[nullworx:newsletter]", JSON.stringify({ requestId, outcome: "honeypot" }));
    return json<NewsletterApiSuccess>(
      { ok: true, message: GENERIC_SUBSCRIBE_MESSAGE, requestId },
      202,
    );
  }

  const runtime = getNewsletterRuntime();
  if (!runtime.service) {
    if (runtime.reason) console.warn("[nullworx:newsletter]", runtime.reason);
    return json<NewsletterApiError>(
      {
        ok: false,
        code: "unavailable",
        message: "Drops is not open yet. No email has been stored.",
      },
      503,
    );
  }

  const idempotencyKey =
    request.headers.get("idempotency-key")?.trim() ||
    createHash("sha256")
      .update(`${normaliseEmail(parsed.data.email)}:${parsed.data.premiumMarketing}:${Math.floor(Date.now() / 600_000)}`)
      .digest("hex");

  try {
    const result = await runtime.service.subscribe(
      { email: parsed.data.email, premiumMarketing: parsed.data.premiumMarketing },
      {
        ip: clientIp(request),
        idempotencyKey,
        sourcePath: "/drops",
      },
    );

    if (result.kind === "rate_limited") {
      return json<NewsletterApiError>(
        {
          ok: false,
          code: "rate_limited",
          message: "Too many attempts. Wait a few minutes and try again.",
          retryAfterSeconds: result.retryAfterSeconds,
        },
        429,
        { "retry-after": String(result.retryAfterSeconds) },
      );
    }

    if (result.kind === "idempotency_conflict") {
      return json<NewsletterApiError>(
        { ok: false, code: "invalid_input", message: "This request could not be accepted." },
        409,
      );
    }

    if (result.kind === "provider_error") {
      const errorName =
        result.cause && typeof result.cause === "object" && "name" in result.cause
          ? String((result.cause as { name?: unknown }).name ?? "Error")
          : "Error";
      console.error("[nullworx:newsletter]", JSON.stringify({ requestId: result.requestId, outcome: "provider_error", errorName }));
      return json<NewsletterApiError>(
        {
          ok: false,
          code: "provider_error",
          message: "The subscription could not be completed. No charge or subscription was made. Try again shortly.",
        },
        502,
      );
    }

    const success: NewsletterApiSuccess = {
      ok: true,
      message: GENERIC_SUBSCRIBE_MESSAGE,
      requestId: result.requestId,
      ...(result.previewConfirmationUrl
        ? {
            preview: {
              confirmationUrl: result.previewConfirmationUrl,
              note: "Local mock only. No email was sent and no real subscriber was created.",
            },
          }
        : {}),
    };

    console.info(
      "[nullworx:newsletter]",
      JSON.stringify({
        requestId: result.requestId,
        outcome: result.provider.kind,
        mode: runtime.mode,
      }),
    );

    return json<NewsletterApiSuccess>(success, 202);
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "Error";
    console.error("[nullworx:newsletter]", JSON.stringify({ requestId, outcome: "unhandled_error", errorName }));
    return json<NewsletterApiError>(
      {
        ok: false,
        code: "provider_error",
        message: "The subscription could not be completed. No charge or subscription was made. Try again shortly.",
      },
      502,
    );
  }
}

export async function GET(): Promise<Response> {
  return json<NewsletterApiError>(
    { ok: false, code: "method_not_allowed", message: "Use POST." },
    405,
    { allow: "POST" },
  );
}
