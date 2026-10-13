// Netlify's ignore contract: exit 0 skips the build, exit 1 builds.
// Build hooks set INCOMING_HOOK_TITLE (https://docs.netlify.com/build/configure-builds/environment-variables/).
const fromBuildHook = Boolean(process.env.INCOMING_HOOK_TITLE);

console.log(
  fromBuildHook ? "Build hook: building." : "Not a build hook: skipping.",
);
process.exit(fromBuildHook ? 1 : 0);
