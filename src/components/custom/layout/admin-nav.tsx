import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

const ACTIVE = { className: "font-semibold" };

// Every admin page was reachable only by typing its address; this is the one place that lists them.
export default function AdminNav() {
  return (
    <nav
      aria-label={m.admin_nav_label()}
      className="mx-auto w-full max-w-6xl px-4 pt-2 sm:px-8"
    >
      <ul className="flex flex-wrap gap-x-4 [&_a]:inline-block [&_a]:py-2">
        <li>
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            activeProps={ACTIVE}
          >
            {m.admin_nav_queue()}
          </Link>
        </li>
        <li>
          <Link to="/admin/entries" activeProps={ACTIVE}>
            {m.admin_nav_entries()}
          </Link>
        </li>
        <li>
          <Link to="/admin/tags" activeProps={ACTIVE}>
            {m.admin_nav_tags()}
          </Link>
        </li>
        <li>
          <Link to="/admin/users" activeProps={ACTIVE}>
            {m.admin_nav_users()}
          </Link>
        </li>
        <li>
          <Link to="/admin/changes" activeProps={ACTIVE}>
            {m.admin_nav_changes()}
          </Link>
        </li>
        <li>
          <Link to="/admin/import" activeProps={ACTIVE}>
            {m.admin_nav_import()}
          </Link>
        </li>
        <li>
          <Link to="/admin/export" activeProps={ACTIVE}>
            {m.admin_nav_export()}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
