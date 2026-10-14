import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { m } from "@/paraglide/messages";

import type { ILinkEntryRef } from "../connections-schemas";

interface IAdminLinksEntryCellProps {
  entry: ILinkEntryRef;
}

export default function AdminLinksEntryCell({
  entry,
}: IAdminLinksEntryCellProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link
        to="/admin/entry/$id"
        params={{ id: entry.id }}
        className="font-medium"
      >
        {entry.name}
      </Link>
      {entry.unclaimed ? (
        <Badge variant="outline">{m.admin_entries_no_owner()}</Badge>
      ) : null}
    </div>
  );
}
