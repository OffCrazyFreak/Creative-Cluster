import { relations } from "drizzle-orm";

import { account, session, user } from "./auth";
import { claimInvite, entry, slugHistory } from "./entries";
import { image } from "./images";
import { link, linkEvidence } from "./links";
import { opportunity, opportunityTag } from "./opportunities";
import { entryTag, tag } from "./tags";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  entries: many(entry),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const entryRelations = relations(entry, ({ one, many }) => ({
  owner: one(user, { fields: [entry.ownerUserId], references: [user.id] }),
  logo: one(image, {
    fields: [entry.logoImageId],
    references: [image.id],
    relationName: "logo",
  }),
  cover: one(image, {
    fields: [entry.coverImageId],
    references: [image.id],
    relationName: "cover",
  }),
  tags: many(entryTag),
  opportunities: many(opportunity),
  slugHistory: many(slugHistory),
  claimInvites: many(claimInvite),
  linksFrom: many(link, { relationName: "from" }),
  linksTo: many(link, { relationName: "to" }),
}));

export const slugHistoryRelations = relations(slugHistory, ({ one }) => ({
  entry: one(entry, { fields: [slugHistory.entryId], references: [entry.id] }),
}));

export const claimInviteRelations = relations(claimInvite, ({ one }) => ({
  entry: one(entry, { fields: [claimInvite.entryId], references: [entry.id] }),
}));

export const tagRelations = relations(tag, ({ one, many }) => ({
  parent: one(tag, {
    fields: [tag.parentId],
    references: [tag.id],
    relationName: "parent",
  }),
  children: many(tag, { relationName: "parent" }),
  entries: many(entryTag),
}));

export const entryTagRelations = relations(entryTag, ({ one }) => ({
  entry: one(entry, { fields: [entryTag.entryId], references: [entry.id] }),
  tag: one(tag, { fields: [entryTag.tagId], references: [tag.id] }),
}));

export const opportunityRelations = relations(opportunity, ({ one, many }) => ({
  entry: one(entry, { fields: [opportunity.entryId], references: [entry.id] }),
  tags: many(opportunityTag),
}));

export const opportunityTagRelations = relations(opportunityTag, ({ one }) => ({
  opportunity: one(opportunity, {
    fields: [opportunityTag.opportunityId],
    references: [opportunity.id],
  }),
  tag: one(tag, { fields: [opportunityTag.tagId], references: [tag.id] }),
}));

export const linkRelations = relations(link, ({ one, many }) => ({
  from: one(entry, {
    fields: [link.fromId],
    references: [entry.id],
    relationName: "from",
  }),
  to: one(entry, {
    fields: [link.toId],
    references: [entry.id],
    relationName: "to",
  }),
  evidence: many(linkEvidence),
}));

export const linkEvidenceRelations = relations(linkEvidence, ({ one }) => ({
  link: one(link, { fields: [linkEvidence.linkId], references: [link.id] }),
}));
