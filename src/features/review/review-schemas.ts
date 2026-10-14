import { z } from "zod";

import {
  REASON_CODES,
  REVIEW_TYPES,
  type ReasonCode,
} from "@/constants/moderation";
import {
  NOTE_REQUIRED_REASON_CODES,
  REPORT_MESSAGE_MAX,
  REPORT_REASONS,
  REVIEW_AGE_FILTERS,
  REVIEW_BULK_MAX,
  REVIEW_NOTE_MAX,
} from "@/constants/review";

export const reviewListSchema = z.object({
  type: z.enum(REVIEW_TYPES).optional(),
  age: z.enum(REVIEW_AGE_FILTERS).default("all"),
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional(),
  page: z.number().int().min(1).default(1),
});

export const decideReviewSchema = z
  .object({
    ids: z.array(z.uuid()).min(1).max(REVIEW_BULK_MAX),
    decision: z.enum(["approve", "reject"]),
    reasonCode: z.enum(REASON_CODES).optional(),
    note: z.string().trim().max(REVIEW_NOTE_MAX).optional(),
  })
  .refine(
    (value) =>
      !value.reasonCode ||
      !NOTE_REQUIRED_REASON_CODES.includes(value.reasonCode) ||
      Boolean(value.note),
    { path: ["note"], message: "A note is required for this reason" },
  );

export const reportSchema = z.object({
  entryId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  message: z.string().trim().max(REPORT_MESSAGE_MAX),
  turnstileToken: z.string().min(1).max(4096),
  // Honeypot: real visitors never see or fill this field.
  fax: z.string().max(200),
});

export type ReviewListInput = z.infer<typeof reviewListSchema>;
export type DecideReviewInput = z.infer<typeof decideReviewSchema>;

export interface IReviewRow {
  id: string;
  type: (typeof REVIEW_TYPES)[number];
  entityType: string;
  entityId: string;
  label: string;
  // Entry that posted an opportunity.
  postedBy: string | null;
  // Set when the system, not a visitor, raised the item (for example an email bounce).
  automatic: boolean;
  kind: string | null;
  countryCode: string | null;
  city: string | null;
  summary: string;
  contactEmail: string | null;
  createdAt: string;
  ageDays: number;
  stale: boolean;
  decidable: boolean;
}

export interface IReviewPage {
  rows: IReviewRow[];
  total: number;
  pageSize: number;
}

// "expired": the post's deadline passed while it waited. "no_account": done, but the entry has no account to email.
export type DecideOutcome =
  "ok" | "gone" | "unsupported" | "failed" | "expired" | "no_account";

export interface IItemDecision {
  decision: DecideReviewInput["decision"];
  reasonCode?: ReasonCode;
  note: string | null;
  adminId: string;
}
export interface IDecideResult {
  id: string;
  outcome: DecideOutcome;
}

export type ReportResult = { status: "sent" | "captcha" | "limited" };
