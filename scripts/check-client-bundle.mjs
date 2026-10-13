import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Names of server-only values and modules that must never reach dist/client.
const FORBIDDEN = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "PSEUDONYM_SECRET",
  "RESEND_API_KEY",
  "CLOUDFLARE_AI_TOKEN",
  "GEOAPIFY_API_KEY",
  "TURNSTILE_SECRET_KEY",
  "drizzle-orm",
  "better-auth/adapters",
];

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory() ? files(join(dir, item.name)) : [join(dir, item.name)],
  );
}

const hits = files("dist/client")
  .filter((file) => /\.(js|html|css|map)$/.test(file))
  .flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return FORBIDDEN.filter((name) => text.includes(name)).map(
      (name) => `${file}: ${name}`,
    );
  });

if (hits.length > 0) {
  console.error(
    `Server-only names found in the client bundle:\n${hits.join("\n")}`,
  );
  process.exit(1);
}
console.log("Client bundle is clean.");
