import { stripOldChangeLog } from "@/features/changes/strip-change-log.server";
import { queueReviewDigests } from "@/features/review/review-digest.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";

type Task = { name: string; run: () => Promise<unknown> };

// Each task is independent and safe to run twice in a day (idempotent mail keys, status-guarded updates).
const TASKS: Task[] = [
  { name: "review-digests", run: () => queueReviewDigests() },
  { name: "strip-change-log", run: () => stripOldChangeLog() },
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
