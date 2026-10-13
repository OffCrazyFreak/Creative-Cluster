import { check, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import {
  TRANSLATABLE_ENTITIES,
  TRANSLATION_ORIGINS,
  type TranslatableEntity,
  type TranslationOrigin,
} from "@/constants/translations";
import { LOCALES } from "@/constants/locales";

import { id, oneOf, updatedAt } from "../columns";

export const translation = pgTable(
  "translation",
  {
    id: id(),
    entityType: text().$type<TranslatableEntity>().notNull(),
    entityId: uuid().notNull(),
    field: text().notNull(),
    locale: text().notNull(),
    text: text().notNull(),
    origin: text().$type<TranslationOrigin>().notNull(),
    provider: text(),
    sourceHash: text().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("translation_entity_field_locale_unique").on(
      t.entityType,
      t.entityId,
      t.field,
      t.locale,
    ),
    check(
      "translation_entity_check",
      oneOf(t.entityType, TRANSLATABLE_ENTITIES),
    ),
    check("translation_locale_check", oneOf(t.locale, LOCALES)),
    check("translation_origin_check", oneOf(t.origin, TRANSLATION_ORIGINS)),
  ],
);
