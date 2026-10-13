import { createFileRoute } from "@tanstack/react-router";

import { site } from "@/sites";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// RFC 9116, per site: each site names its own contact and canonical URL.
function securityTxt(): string {
  const expires = new Date(Date.now() + ONE_YEAR_MS).toISOString();
  return [
    `Contact: mailto:${site.contactEmail}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en, hr",
    `Canonical: ${site.origin}/.well-known/security.txt`,
    "",
  ].join("\n");
}

export const Route = createFileRoute("/.well-known/security.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(securityTxt(), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
