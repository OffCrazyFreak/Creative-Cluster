import { cn } from "cn";
import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

interface IMainNavProps {
  className?: string;
  listClassName?: string;
}

export default function MainNav({ className, listClassName }: IMainNavProps) {
  return (
    <nav aria-label={m.common_main_navigation()} className={className}>
      <ul
        className={cn(
          "flex items-center gap-x-4 [&_a]:inline-block [&_a]:py-2",
          listClassName,
        )}
      >
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
