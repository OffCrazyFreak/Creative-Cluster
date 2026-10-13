import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

interface IEntryFreshnessProps {
  updatedAt: string;
  lastConfirmedAt: string | null;
}

export default function EntryFreshness({
  updatedAt,
  lastConfirmedAt,
}: IEntryFreshnessProps) {
  function format(value: string) {
    return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(
      new Date(value),
    );
  }

  return (
    <p className="flex flex-wrap gap-x-4 text-sm">
      <span>{m.entry_last_updated({ date: format(updatedAt) })}</span>
      {lastConfirmedAt ? (
        <span>{m.entry_last_confirmed({ date: format(lastConfirmedAt) })}</span>
      ) : null}
    </p>
  );
}
