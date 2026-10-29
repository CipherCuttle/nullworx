"use client";

import { trackClientEvent } from "@/lib/analytics/client";

export function SupportLink({
  href,
  className,
  location = "footer",
  children,
}: {
  href: string;
  className?: string;
  location?: "footer" | "effect-preview";
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackClientEvent("support_link_clicked", { location })}
    >
      {children}
    </a>
  );
}
