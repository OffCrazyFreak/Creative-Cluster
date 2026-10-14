import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

interface IEntryFreshnessProps {
  updatedAt: string;
  lastConfirmedAt: string | null;
}

export default function EntryFreshness({
  updatedAt,
  lastConfirmedAt,
}: IEntryFreshnessProps) {
  return (
    <p className="flex flex-wrap gap-x-4 text-sm">
      <span>{m.entry_last_updated({ date: formatDate(updatedAt) })}</span>
      {lastConfirmedAt ? (
        <span>
          {m.entry_last_confirmed({ date: formatDate(lastConfirmedAt) })}
        </span>
      ) : null}
    </p>
  );
}
