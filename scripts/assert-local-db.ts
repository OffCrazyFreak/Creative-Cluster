import "./load-env";

// Seeded demo data goes live in the public directory, so only a local database is allowed.
const host = new URL(process.env.DATABASE_URL ?? "postgres://invalid").hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
  console.error(
    `Refusing to seed demo data into ${host}: local databases only.`,
  );
  process.exit(1);
}
