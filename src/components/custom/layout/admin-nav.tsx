import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

// Every admin page was reachable only by typing its address; this is the one place that lists them.
export default function AdminNav() {
  return (
    <nav
      aria-label={m.admin_nav_label()}
      className="mx-auto w-full max-w-6xl px-4 pt-2 sm:px-8"
    >
      <ul className="flex flex-wrap gap-x-4 [&_a]:inline-block [&_a]:py-2">
        <li>
          <Link to="/admin" activeOptions={{ exact: true }}>
            {m.admin_nav_queue()}
          </Link>
        </li>
        <li>
          <Link to="/admin/entries">{m.admin_nav_entries()}</Link>
        </li>
        <li>
          <Link to="/admin/tags">{m.tags_admin_title()}</Link>
        </li>
        <li>
          <Link to="/admin/users">{m.admin_nav_users()}</Link>
        </li>
        <li>
          <Link to="/admin/changes">{m.review_changes_title()}</Link>
        </li>
        <li>
          <Link to="/admin/import">{m.admin_nav_import()}</Link>
        </li>
        <li>
          <Link to="/admin/export">{m.connections_export_title()}</Link>
        </li>
      </ul>
    </nav>
  );
}
