import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

export default function MainNav() {
  return (
    <nav aria-label={m.common_main_navigation()}>
      <ul className="flex flex-wrap items-center gap-4">
        <li>
          <Link to="/">{m.common_nav_map()}</Link>
        </li>
        <li>
          <Link to="/directory">{m.common_nav_directory()}</Link>
        </li>
        <li>
          <Link to="/opportunities">{m.common_nav_opportunities()}</Link>
        </li>
        <li>
          <Link to="/about">{m.common_nav_about()}</Link>
        </li>
        <li>
          <Link to="/apply">{m.common_nav_apply()}</Link>
        </li>
      </ul>
    </nav>
  );
}
