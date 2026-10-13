import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

import {
  JOB_STATUSES,
  JOB_TYPES,
  type JobStatus,
  type JobType,
} from "@/constants/jobs";

import { createdAt, id, oneOf, timestamptz, updatedAt } from "../columns";

// Outbox: rows are written in the same transaction as the change that needs them.
export const job = pgTable(
  "job",
  {
    id: id(),
    type: text().$type<JobType>().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text().unique(),
    priority: integer().notNull().default(5),
    runAt: timestamptz().notNull().defaultNow(),
    attempts: integer().notNull().default(0),
    status: text().$type<JobStatus>().notNull().default("queued"),
    error: text(),
    lockedAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.status, t.runAt, t.priority),
    check("job_type_check", oneOf(t.type, JOB_TYPES)),
    check("job_status_check", oneOf(t.status, JOB_STATUSES)),
  ],
);
