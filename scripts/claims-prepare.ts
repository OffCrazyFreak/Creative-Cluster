import "./load-env";

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "import-source": { type: "string" },
    out: { type: "string" },
  },
});

// Dynamic imports: the env must be loaded before the database client reads it.
const { site } = await import("../src/sites");
const { renderEmail } = await import("../src/lib/email/render-email");
const { prepareClaimInvites, listUnsentInvites } =
  await import("../src/features/claims/prepare-claims.server");
const { claimEmailProps } =
  await import("../src/features/claims/claim-email-props.server");

// Left visible on purpose: the reviewer must see the gap, and claims:send refuses a text that still holds it.
const importSource =
  values["import-source"]?.trim() || "[[GAP: import source and year]]";
const outDir = values.out ?? join("data", "claims", site.id);

const result = await prepareClaimInvites();
const invites = await listUnsentInvites();

mkdirSync(outDir, { recursive: true });
// Files of invites that were since removed, renamed or sent must not linger with real addresses in them.
for (const file of readdirSync(outDir))
  if (file.endsWith(".html") || file.endsWith(".txt"))
    rmSync(join(outDir, file));
for (const invite of invites) {
  const props = claimEmailProps(invite, importSource);
  const { html, text, subject } = await renderEmail("claim", props);
  writeFileSync(join(outDir, `${invite.slug}.html`), html);
  writeFileSync(
    join(outDir, `${invite.slug}.txt`),
    `To: ${invite.email}\nSubject: ${subject}\n\n${text}\n`,
  );
}

console.log(
  `Created ${result.created} invites, skipped ${result.invalidEmail} with an invalid address and ${result.suppressed} suppressed.`,
);
if (result.sharedAddresses > 0)
  console.log(
    `${result.sharedAddresses} addresses belong to more than one listing: claims:send mails each address once.`,
  );
console.log(
  `Rendered ${invites.length} unsent claim emails into ${outDir}. Nothing was queued or sent.`,
);
console.log("These files hold real addresses and live links: keep them local.");
process.exit(0);
