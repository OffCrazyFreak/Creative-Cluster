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

// Secret values from .env.ci too: a value inlined as a literal would carry no name.
const SECRET_KEYS = /SECRET|TOKEN|PASSWORD|DATABASE_URL|API_KEY/;
const envCiValues = readFileSync(".env.ci", "utf8")
  .split("\n")
  .map((line) => line.match(/^([A-Z_]+)=(.+)$/))
  .filter(
    (match) =>
      match && SECRET_KEYS.test(match[1]) && !match[1].startsWith("VITE_"),
  )
  .map((match) => match[2]);
FORBIDDEN.push(...envCiValues);

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
