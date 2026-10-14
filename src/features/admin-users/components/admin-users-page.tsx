import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { MIN_ADMINS } from "@/constants/roles";
import { m } from "@/paraglide/messages";

import { adminUsersQueryOptions } from "../admin-users-queries";
import InviteForm from "./invite-form";
import UsersTable from "./users-table";

export default function AdminUsersPage() {
  const { viewer } = useRouteContext({ from: "__root__" });
  const { data } = useQuery(adminUsersQueryOptions());
  if (!data || !viewer) return null;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{m.admin_users_title()}</h1>
      <p>{m.admin_users_intro({ min: MIN_ADMINS })}</p>
      <Alert role="status">
        <AlertDescription>
          {m.admin_users_admin_count({ count: data.activeAdmins })}
        </AlertDescription>
      </Alert>
      {data.users.length === 0 ? (
        <p>{m.admin_users_empty()}</p>
      ) : (
        <UsersTable users={data.users} viewerId={viewer.id} />
      )}
      <InviteForm />
    </section>
  );
}
