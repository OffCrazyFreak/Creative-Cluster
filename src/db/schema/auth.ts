import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { LOCALES } from "@/constants/locales";
import { USER_ROLES } from "@/constants/roles";

import { createdAt, id, oneOf, timestamptz, updatedAt } from "../columns";

export const user = pgTable(
  "user",
  {
    id: id(),
    name: text().notNull(),
    email: text().notNull().unique("user_email_unique"),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: text().notNull().default("member"),
    banned: boolean().notNull().default(false),
    banReason: text(),
    banExpires: timestamptz(),
    // No default: better-auth fills it from site.baseLocale, which differs per site.
    locale: text().notNull(),
    invitedBy: uuid(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("user_role_check", oneOf(t.role, USER_ROLES)),
    check("user_locale_check", oneOf(t.locale, LOCALES)),
  ],
);

export const session = pgTable(
  "session",
  {
    id: id(),
    expiresAt: timestamptz().notNull(),
    token: text().notNull().unique("session_token_unique"),
    ipAddress: text(),
    userAgent: text(),
    impersonatedBy: uuid(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: id(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamptz(),
    refreshTokenExpiresAt: timestamptz(),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamptz().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: id(),
  key: text().notNull().unique("rate_limit_key_unique"),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});
