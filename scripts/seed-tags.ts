import "./load-env";

// Imports are dynamic because the env must be loaded before the database client reads it.
const { db } = await import("@/db/client.server");
const { site } = await import("@/sites");
const { tagSeedFor } = await import("@/features/tags/seeds/tag-seeds");
const { seedTags } = await import("@/features/tags/seed-tags.server");

const result = await seedTags(db, tagSeedFor(site.tagSeed));
console.log(
  `${site.id}: ${result.inserted} new tags, ${result.total - result.inserted} already present`,
);
process.exit(0);
