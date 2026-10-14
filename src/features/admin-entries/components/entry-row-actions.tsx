import { Link } from "@tanstack/react-router";
import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLifecycleAction } from "@/features/lifecycle/hooks/use-lifecycle-action";
import {
  reinstateEntryFn,
  setTrustedFn,
} from "@/features/lifecycle/lifecycle.functions";
import { m } from "@/paraglide/messages";

import type { IAdminEntryRow } from "../admin-entries-schemas";
import { ADMIN_KEY } from "../admin-entries-queries";
import type { IEntryDialog } from "../entry-dialog-state";

interface IEntryRowActionsProps {
  row: IAdminEntryRow;
  onDialog: (dialog: IEntryDialog) => void;
}

export default function EntryRowActions({
  row,
  onDialog,
}: IEntryRowActionsProps) {
  const run = useLifecycleAction(ADMIN_KEY);
  const isStub = row.kind === "outside_partner";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="max-sm:size-11"
            aria-label={m.admin_entries_actions_for({ name: row.name })}
          />
        }
      >
        <MoreHorizontalIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link to="/admin/entry/$id" params={{ id: row.id }} />}
        >
          {m.admin_entries_action_open()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {row.status === "published" && (
          <DropdownMenuItem onClick={() => onDialog({ kind: "suspend", row })}>
            {m.lifecycle_suspend()}
          </DropdownMenuItem>
        )}
        {row.status === "suspended" && (
          <DropdownMenuItem
            onClick={() =>
              void run(() => reinstateEntryFn({ data: { id: row.id } }))
            }
          >
            {m.lifecycle_reinstate()}
          </DropdownMenuItem>
        )}
        {!isStub && (
          <DropdownMenuItem
            onClick={() =>
              void run(() =>
                setTrustedFn({ data: { id: row.id, trusted: !row.trusted } }),
              )
            }
          >
            {row.trusted
              ? m.admin_entries_action_untrust()
              : m.admin_entries_action_trust()}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
