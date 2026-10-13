export const TRANSLATION_ORIGINS = ["machine", "human"] as const;
export type TranslationOrigin = (typeof TRANSLATION_ORIGINS)[number];

export const TRANSLATABLE_ENTITIES = ["entry", "opportunity"] as const;
export type TranslatableEntity = (typeof TRANSLATABLE_ENTITIES)[number];
