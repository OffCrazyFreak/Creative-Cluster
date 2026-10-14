import { Link } from "@tanstack/react-router";

import type { EntryStatus } from "@/constants/entry";
import { statusLabel } from "@/features/lifecycle/status-label";
import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

import type { IStatusChange } from "../admin-entries-schemas";

interface IStatusHistoryProps {
  entryId: string;
  history: IStatusChange[];
}

function label(status: string | null): string {
  return status ? statusLabel(status as EntryStatus) : "";
}

export default function StatusHistory({
  entryId,
  history,
}: IStatusHistoryProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">
        {m.admin_entries_history_title()}
      </h2>
      {history.length === 0 ? (
        <p>{m.admin_entries_history_none()}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {history.map((item) => (
            <li key={item.id}>
              {m.admin_entries_history_item({
                date: formatDate(item.createdAt),
                from: label(item.from),
                to: label(item.to),
                who: item.actor ?? item.source,
              })}
              {item.reason ? ` ${item.reason}` : ""}
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/admin/changes"
        search={{ entityId: entryId, page: 1 }}
        className="self-start"
      >
        {m.admin_entries_history_all()}
      </Link>
    </section>
  );
}
