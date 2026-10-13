import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { m } from "@/paraglide/messages";

import { adminTagsQuery } from "../tag-queries";
import type { IAdminTagRow } from "../tag-schemas";
import TagEditDialog from "./tag-edit-dialog";
import TagMergeDialog from "./tag-merge-dialog";
import TagsTable from "./tags-table";

export default function AdminTagsPage() {
  const { data, isError } = useQuery(adminTagsQuery());
  const [editing, setEditing] = useState<IAdminTagRow | null>(null);
  const [merging, setMerging] = useState<IAdminTagRow | null>(null);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">{m.tags_admin_title()}</h1>
      {isError && <p role="alert">{m.tags_admin_error()}</p>}
      {data && (
        <TagsTable rows={data} onEdit={setEditing} onMerge={setMerging} />
      )}
      {editing && (
        <TagEditDialog
          key={editing.id}
          tag={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {merging && data && (
        <TagMergeDialog
          key={merging.id}
          source={merging}
          candidates={data}
          onClose={() => setMerging(null)}
        />
      )}
    </section>
  );
}
