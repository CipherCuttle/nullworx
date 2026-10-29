import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./globals.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SITE_DESCRIPTION, SITE_NAME, siteOrigin } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  applicationName: SITE_NAME,
  title: {
    default: "Nullworx — Procedural effects for the web",
    template: "%s — Nullworx",
  },
  description: SITE_DESCRIPTION,
  category: "technology",
  authors: [{ name: "CipherCuttle", url: "https://github.com/CipherCuttle" }],
  creator: "CipherCuttle",
  publisher: SITE_NAME,
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    url: siteOrigin,
    title: "Nullworx — Procedural effects for the web",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Nullworx — Procedural effects for the web",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#090a08",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
