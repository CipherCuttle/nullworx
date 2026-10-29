import { NextResponse } from "next/server";
import { getNewsletterRuntime } from "@/lib/newsletter/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const runtime = getNewsletterRuntime();
  if (runtime.mode !== "mock" || !runtime.mockProvider) {
    return NextResponse.json({ ok: false }, { status: 404, headers: { "cache-control": "no-store" } });
  }

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await runtime.mockProvider.unsubscribe(token);
  const target = new URL("/drops/unsubscribed", request.url);
  target.searchParams.set("preview", "1");
  if (!result.unsubscribed) target.searchParams.set("status", "invalid");
  return NextResponse.redirect(target, { status: 303, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
