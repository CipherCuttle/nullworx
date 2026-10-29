/**
 * The DOI redirect is configured in two places: the Brevo template/API call and
 * the provider environment. This helper keeps the application value pinned to
 * the canonical site origin and the exact confirmation route so a typo cannot
 * redirect confirmed subscribers to a different host or path.
 */
export function normaliseConfirmRedirectUrl(
  value: string | undefined,
  canonicalOrigin: string,
): string | null {
  if (!value?.trim()) return null;

  let canonical: URL;
  let redirect: URL;
  try {
    canonical = new URL(canonicalOrigin);
    redirect = new URL(value.trim());
  } catch {
    return null;
  }

  const local = canonical.protocol === "http:" && ["localhost", "127.0.0.1"].includes(canonical.hostname);
  if (redirect.protocol !== "https:" && !local) return null;
  if (redirect.username || redirect.password) return null;
  if (redirect.origin !== canonical.origin) return null;
  if (redirect.search || redirect.hash) return null;
  if (redirect.pathname.replace(/\/+$/, "") !== "/drops/confirmed") return null;

  return new URL("/drops/confirmed", canonical.origin).toString();
}
