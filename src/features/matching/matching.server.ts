import type { Db } from "@/db/client.server";
import type { EntryKind } from "@/constants/entry";

import { MAX_REASON_TAGS, STRONG_SCORE } from "./matching-constants";
import { matchQuery } from "./matching-sql.server";
import type {
  ICollaborationCard,
  ICollaborationResult,
  IMatchReason,
  IMatchTag,
  MatchRelation,
} from "./matching-schemas";

interface IMatchRow {
  entryId: string;
  slug: string;
  name: string;
  kind: EntryKind;
  city: string | null;
  countryCode: string | null;
  logoImageId: string | null;
  hasExchange: boolean;
  offersW: number;
  seeksW: number;
  score: number;
  shared: Array<IMatchTag & { relation: MatchRelation }>;
}

const RELATION_ORDER: MatchRelation[] = ["offers", "seeks", "topic"];

function reasonsOf(shared: IMatchRow["shared"], hasExchange: boolean) {
  const relations = hasExchange
    ? RELATION_ORDER.slice(0, 2)
    : ["topic" as const];
  return relations.flatMap<IMatchReason>((relation) => {
    const tags = shared
      .filter((item) => item.relation === relation)
      .slice(0, MAX_REASON_TAGS)
      .map(({ slug, labelEn, labelHr }) => ({ slug, labelEn, labelHr }));
    return tags.length ? [{ relation, tags }] : [];
  });
}

function toCard(row: IMatchRow): ICollaborationCard {
  const mutual = row.offersW > 0 && row.seeksW > 0;
  const strong = mutual || row.score >= STRONG_SCORE;
  return {
    entryId: row.entryId,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    city: row.city,
    countryCode: row.countryCode,
    logoImageId: row.logoImageId,
    score: row.score,
    strength: row.hasExchange ? (strong ? "strong" : "possible") : null,
    reasons: reasonsOf(row.shared, row.hasExchange),
  };
}

export async function findCollaborators(
  db: Db,
  entryId: string,
): Promise<ICollaborationResult> {
  // Both drivers (pg, neon) return { rows }; the generic Db type leaves it unknown.
  const { rows } = (await db.execute(matchQuery(entryId))) as {
    rows: IMatchRow[];
  };
  const mode = rows[0] && !rows[0].hasExchange ? "similar" : "collaborate";
  return { mode, cards: rows.map(toCard) };
}
