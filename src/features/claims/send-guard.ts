import { CLAIMS_APPROVAL_ENV } from "@/constants/import";

export interface ISendFlags {
  batch: number | null;
  confirm: boolean;
  importSource: string | null;
}

// Real mail to imported contacts goes out only after the owner's go-ahead, which is the env value plus an explicit confirm.
export function sendBlocker(
  env: Record<string, string | undefined>,
  flags: ISendFlags,
): string | null {
  if (env[CLAIMS_APPROVAL_ENV] !== "yes")
    return `Refusing to run: ${CLAIMS_APPROVAL_ENV}=yes is not set. Claim emails must not be sent until the owner approves.`;
  if (!flags.confirm) return "Refusing to run without --confirm.";
  if (
    !flags.batch ||
    !Number.isInteger(flags.batch) ||
    flags.batch < 1 ||
    flags.batch > 500
  )
    return "Pass --batch <n> with n between 1 and 500.";
  if (!flags.importSource || flags.importSource.includes("[[GAP"))
    return 'Pass --import-source "<one sentence on where the data came from>" with the final wording.';
  return null;
}
