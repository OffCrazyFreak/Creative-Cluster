import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

export default function MainNav() {
  return (
    <nav
      aria-label={m.common_main_navigation()}
      className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 lg:order-none lg:mx-0 lg:w-auto lg:flex-1 lg:overflow-visible lg:px-0"
    >
      <ul className="flex items-center gap-x-4 whitespace-nowrap [&_a]:inline-block [&_a]:py-2">
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
