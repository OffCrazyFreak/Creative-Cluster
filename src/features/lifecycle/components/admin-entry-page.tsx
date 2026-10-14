import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { useLifecycleAction } from "../hooks/use-lifecycle-action";
import {
  archiveEntryAdminFn,
  reinstateEntryFn,
  restoreEntryAdminFn,
  setTrustedFn,
  suspendEntryFn,
} from "../lifecycle.functions";
import { adminEntryQueryOptions } from "../lifecycle-queries";
import { statusLabel } from "../status-label";
import SuspendDialog from "./suspend-dialog";

interface IAdminEntryPageProps {
  id: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function AdminEntryPage({ id }: IAdminEntryPageProps) {
  const { data } = useQuery(adminEntryQueryOptions(id));
  const run = useLifecycleAction(adminEntryQueryOptions(id).queryKey);
  const [suspending, setSuspending] = useState(false);
  if (!data) return null;

  const hidden = data.erasureRequestedAt !== null;
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <Link to="/admin">{m.lifecycle_admin_back()}</Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">
          {m.lifecycle_admin_title({ name: data.name })}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span>{m.lifecycle_admin_status()}:</span>
          <Badge
            variant={data.status === "suspended" ? "destructive" : "secondary"}
          >
            {statusLabel(data.status)}
          </Badge>
        </div>
      </header>
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          {data.ownerEmail
            ? m.lifecycle_admin_owner({ email: data.ownerEmail })
            : m.lifecycle_admin_no_owner()}
        </li>
        <li>
          {data.lastConfirmedAt
            ? m.lifecycle_admin_confirmed({
                date: formatDate(data.lastConfirmedAt),
              })
            : m.lifecycle_admin_never_confirmed()}
        </li>
        {data.importedAt && (
          <li>
            {m.lifecycle_admin_imported({ date: formatDate(data.importedAt) })}
          </li>
        )}
        {data.suspendedReason && (
          <li>{m.lifecycle_admin_reason({ reason: data.suspendedReason })}</li>
        )}
        {data.erasureRequestedAt && (
          <li>
            {m.lifecycle_admin_erasure({
              date: formatDate(data.erasureRequestedAt),
            })}
          </li>
        )}
      </ul>
      {data.status === "published" && (
        <Link to="/e/$slug" params={{ slug: data.slug }}>
          {m.lifecycle_admin_view_public()}
        </Link>
      )}
      <div className="flex flex-wrap gap-2">
        {data.status === "published" && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setSuspending(true)}
          >
            {m.lifecycle_suspend()}
          </Button>
        )}
        {data.status === "suspended" && !hidden && (
          <Button
            type="button"
            onClick={() => void run(() => reinstateEntryFn({ data: { id } }))}
          >
            {m.lifecycle_reinstate()}
          </Button>
        )}
        {(data.status === "published" || data.status === "suspended") && (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void run(() => archiveEntryAdminFn({ data: { id } }))
            }
          >
            {m.lifecycle_archive()}
          </Button>
        )}
        {data.status === "archived" && !hidden && (
          <Button
            type="button"
            onClick={() =>
              void run(() => restoreEntryAdminFn({ data: { id } }))
            }
          >
            {m.lifecycle_restore()}
          </Button>
        )}
      </div>
      <Field orientation="horizontal">
        <Checkbox
          id="entry-trusted"
          checked={data.trusted}
          onCheckedChange={(checked) =>
            void run(() => setTrustedFn({ data: { id, trusted: checked } }))
          }
        />
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="entry-trusted">
            {m.lifecycle_trusted()}
          </FieldLabel>
          <FieldDescription>{m.lifecycle_trusted_hint()}</FieldDescription>
        </div>
      </Field>
      <SuspendDialog
        name={data.name}
        open={suspending}
        onOpenChange={setSuspending}
        onConfirm={(reason) =>
          run(() => suspendEntryFn({ data: { id, reason } }))
        }
      />
    </section>
  );
}
