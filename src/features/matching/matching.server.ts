import type { Db } from "@/db/client.server";

import {
  MAX_REASON_TAGS,
  MUTUAL_BONUS,
  STRONG_SCORE,
} from "./matching-constants";
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
  city: string | null;
  countryCode: string | null;
  useExchange: boolean;
  offersW: number;
  seeksW: number;
  shared: Array<IMatchTag & { relation: MatchRelation }>;
}

const RELATION_ORDER: MatchRelation[] = ["offers", "seeks", "topic"];

// Topic lines show in both modes because topics also decide the order of exchange cards.
function reasonsOf(shared: IMatchRow["shared"]) {
  return RELATION_ORDER.flatMap<IMatchReason>((relation) => {
    const tags = shared
      .filter((item) => item.relation === relation)
      .slice(0, MAX_REASON_TAGS)
      .map(({ slug, labelEn, labelHr }) => ({ slug, labelEn, labelHr }));
    return tags.length ? [{ relation, tags }] : [];
  });
}

function toCard(row: IMatchRow): ICollaborationCard {
  const mutual = row.offersW > 0 && row.seeksW > 0;
  const exchange = row.offersW + row.seeksW + (mutual ? MUTUAL_BONUS : 0);
  const strong = mutual || exchange >= STRONG_SCORE;
  return {
    entryId: row.entryId,
    slug: row.slug,
    name: row.name,
    city: row.city,
    countryCode: row.countryCode,
    strength: row.useExchange ? (strong ? "strong" : "possible") : null,
    reasons: reasonsOf(row.shared),
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
  const mode = rows[0] && !rows[0].useExchange ? "similar" : "collaborate";
  return { mode, cards: rows.map(toCard) };
}
