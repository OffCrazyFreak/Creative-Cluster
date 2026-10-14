import { Link, useRouteContext } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";

import { safeAuthCall } from "../safe-auth-call";
import { useRefreshViewer } from "../hooks/use-refresh-viewer";

export default function AuthNav() {
  const { viewer } = useRouteContext({ from: "__root__" });
  const refreshViewer = useRefreshViewer();

  async function logOut() {
    // Refresh either way: if signOut failed the viewer query shows the session is still there.
    await safeAuthCall(() => authClient.signOut());
    await refreshViewer();
  }

  if (!viewer) return <Link to="/login">{m.common_nav_login()}</Link>;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 [&_a]:inline-block [&_a]:py-2">
      <li>
        <Link to="/account">{m.common_nav_account()}</Link>
      </li>
      {viewer.role === "admin" && (
        <li>
          <Link to="/admin">{m.common_nav_admin()}</Link>
        </li>
      )}
      <li>
        <Button type="button" variant="outline" onClick={() => void logOut()}>
          {m.auth_logout()}
        </Button>
      </li>
    </ul>
  );
}
