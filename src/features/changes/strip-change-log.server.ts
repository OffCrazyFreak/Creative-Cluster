import { sql } from "drizzle-orm";

import {
  CHANGE_LOG_PERSONAL_FIELDS,
  CHANGE_LOG_RETENTION_DAYS,
} from "@/constants/review";
import { db, type DbOrTx } from "@/db/client.server";

const KEYS = sql.raw(
  `array[${CHANGE_LOG_PERSONAL_FIELDS.map((f) => `'${f}'`).join(", ")}]`,
);

// Removes personal values and the actor from rows older than the retention window (jsonb "-" drops keys).
// A person's own name is the identifier, so their rows lose every stored value, not only the listed fields.
export async function stripOldChangeLog(tx: DbOrTx = db) {
  await tx.execute(sql`
    update change_log
    set before = null, after = null, user_id = null
    where created_at < now() - make_interval(days => ${CHANGE_LOG_RETENTION_DAYS})
      and entity_type = 'entry'
      and entity_id in (select id from entry where kind = 'person')
      and (before is not null or after is not null or user_id is not null)`);
  await tx.execute(sql`
    update change_log
    set before = before - ${KEYS},
        after = after - ${KEYS},
        user_id = null
    where created_at < now() - make_interval(days => ${CHANGE_LOG_RETENTION_DAYS})
      and (user_id is not null
        or before ?| ${KEYS}
        or after ?| ${KEYS})`);
}

// On erasure every row of the entity loses its stored values and its actor at once, whatever its age:
// names, descriptions and websites identify the person too. Only the audit shape (action, fields) stays.
export async function stripEntityChangeLog(tx: DbOrTx, entityId: string) {
  await tx.execute(sql`
    update change_log
    set before = null, after = null, user_id = null
    where entity_id = ${entityId}`);
}
