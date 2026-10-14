import { Link } from "@tanstack/react-router";
import { useRef } from "react";

import AuthNav from "@/features/auth/components/auth-nav";
import { useHeaderHeight } from "@/hooks/use-header-height";
import { site } from "@/sites";

import LanguageSwitch from "./language-switch";
import MainNav from "./main-nav";

export default function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  useHeaderHeight(headerRef);

  return (
    <header ref={headerRef} className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 px-4 py-1 sm:px-8 lg:flex-nowrap">
        <Link to="/" className="max-w-full truncate py-2 font-semibold">
          {site.name}
        </Link>
        <MainNav />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-4 [&_a]:inline-block [&_a]:py-2">
          <AuthNav />
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
