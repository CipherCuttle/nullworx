export const SITE_NAME = "Nullworx";
export const SITE_TAGLINE = "An experimental effect library for the web";
export const SITE_DESCRIPTION =
  "Nullworx is an experimental library of procedural visual effects for developers and creative coders. Strange, reusable fields of characters, masks and matter.";
export const SOURCE_REPOSITORY = "https://github.com/CipherCuttle/nullworx";
export const OWNER_PROFILE = "https://github.com/CipherCuttle";
export const DEFAULT_SITE_ORIGIN = "https://nulllworx.site";

export function normaliseSiteOrigin(input: string | undefined): string {
  const raw = input?.trim() || DEFAULT_SITE_ORIGIN;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute URL.");
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS (local HTTP is allowed for development).");
  }
  return url.origin;
}

export const siteOrigin = normaliseSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteOrigin}/`).toString();
}

export function isBuyMeACoffeeUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "buymeacoffee.com" || url.hostname === "www.buymeacoffee.com") &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

export const supportUrl = isBuyMeACoffeeUrl(process.env.NEXT_PUBLIC_SUPPORT_URL)
  ? process.env.NEXT_PUBLIC_SUPPORT_URL
  : null;

export const primaryNav = [
  { href: "/effects", label: "Effects" },
  { href: "/drops", label: "Drops" },
  { href: "/about", label: "About" },
] as const;

export const footerNav = [
  { href: "/effects", label: "Effects" },
  { href: "/drops", label: "Drops" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/licenses", label: "Licenses" },
] as const;

export const legalUpdated = "2026-10-28";
