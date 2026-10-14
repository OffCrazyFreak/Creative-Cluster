import { stripOldChangeLog } from "@/features/changes/strip-change-log.server";
import {
  archiveStaleImports,
  deleteDueErasedAccounts,
  purgeExpiredApplications,
  purgeOldInviteTokens,
} from "@/features/lifecycle/scheduled-lifecycle.server";
import { queueReviewDigests } from "@/features/review/review-digest.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";

type Task = { name: string; run: () => Promise<unknown> };

// Each task is independent and safe to run twice in a day (idempotent mail keys, status-guarded updates).
const TASKS: Task[] = [
  { name: "review-digests", run: () => queueReviewDigests() },
  { name: "strip-change-log", run: () => stripOldChangeLog() },
  { name: "delete-erased-accounts", run: () => deleteDueErasedAccounts() },
  { name: "archive-stale-imports", run: () => archiveStaleImports() },
  { name: "purge-expired-applications", run: () => purgeExpiredApplications() },
  { name: "purge-old-invite-tokens", run: () => purgeOldInviteTokens() },
];

export async function runDailyMaintenance(): Promise<Record<string, string>> {
  const outcome: Record<string, string> = {};
  for (const task of TASKS) {
    try {
      await task.run();
      outcome[task.name] = "ok";
    } catch (error) {
      console.error(`daily maintenance task failed: ${task.name}`, error);
      outcome[task.name] = "failed";
    }
  }
  await triggerDrain();
  return outcome;
}
