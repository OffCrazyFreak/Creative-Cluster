import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { useAdminTagActions } from "../hooks/use-admin-tag-actions";
import type { IAdminTagRow } from "../tag-schemas";
import type { ITagColumnActions } from "./tag-columns";

interface ITagRowActionsProps extends ITagColumnActions {
  row: IAdminTagRow;
}

export default function TagRowActions({
  row,
  onEdit,
  onMerge,
}: ITagRowActionsProps) {
  const { decide } = useAdminTagActions();
  const isOpenSuggestion = row.status === "suggested" && !row.canonicalId;

  function decideWith(decision: "approve" | "reject") {
    decide.mutate({ data: { tagId: row.id, decision } });
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
        {m.tags_admin_edit()}
      </Button>
      {!row.canonicalId && row.status !== "rejected" && (
        <Button size="sm" variant="outline" onClick={() => onMerge(row)}>
          {m.tags_admin_merge()}
        </Button>
      )}
      {isOpenSuggestion && (
        <>
          <Button
            size="sm"
            disabled={decide.isPending}
            onClick={() => decideWith("approve")}
          >
            {m.tags_admin_approve()}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={decide.isPending}
            onClick={() => decideWith("reject")}
          >
            {m.tags_admin_reject()}
          </Button>
        </>
      )}
    </div>
  );
}
