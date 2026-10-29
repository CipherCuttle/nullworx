import { NextResponse } from "next/server";
import { analyticsPayloadSchema } from "@/lib/analytics/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415, headers: NO_STORE });
  }

  const text = await request.text();
  if (text.length > 1_024) {
    return NextResponse.json({ ok: false }, { status: 413, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });
  }

  const parsed = analyticsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });
  }

  // First-party aggregate logging only. The request IP and user agent are never
  // read, and there is no persistent client identifier. The hosting provider's
  // ordinary access logs are outside this application's control.
  console.info(
    "[nullworx:event]",
    JSON.stringify({
      ...parsed.data,
      at: new Date().toISOString(),
    }),
  );

  return new NextResponse(null, { status: 204, headers: NO_STORE });
}

export async function GET(): Promise<Response> {
  return NextResponse.json(
    { ok: false, code: "method_not_allowed" },
    { status: 405, headers: { ...NO_STORE, allow: "POST" } },
  );
}
