import type { ZxcvbnFactory } from "@zxcvbn-ts/core";

let factory: Promise<ZxcvbnFactory> | null = null;

// The word lists are large, so they download on the first focus of a password field, not with the page.
export function loadStrengthChecker(): Promise<ZxcvbnFactory> {
  // A failed download must not be cached, or the bar stays dead until a reload.
  factory ??= Promise.all([
    import("@zxcvbn-ts/core"),
    import("@zxcvbn-ts/language-common"),
    import("@zxcvbn-ts/language-en"),
  ])
    .then(
      ([core, common, en]) =>
        new core.ZxcvbnFactory({
          translations: en.translations,
          graphs: common.adjacencyGraphs,
          dictionary: { ...common.dictionary, ...en.dictionary },
        }),
    )
    .catch((error: unknown) => {
      factory = null;
      throw error;
    });
  return factory;
}
