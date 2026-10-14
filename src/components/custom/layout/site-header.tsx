import { Link } from "@tanstack/react-router";
import { useRef } from "react";

import AuthNav from "@/features/auth/components/auth-nav";
import { useHeaderHeight } from "@/hooks/use-header-height";
import { site } from "@/sites";

import LanguageSwitch from "./language-switch";
import MainNav from "./main-nav";
import MobileMenu from "./mobile-menu";

export default function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  useHeaderHeight(headerRef);

  return (
    <header ref={headerRef} className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-x-6 px-4 py-1 sm:px-8">
        <Link to="/" className="min-w-0 truncate py-2 font-semibold">
          {site.name}
        </Link>
        <MainNav className="hidden lg:block lg:flex-1" />
        <div className="ml-auto hidden items-center justify-end gap-x-4 lg:flex [&_a]:inline-block [&_a]:py-2">
          <AuthNav />
          <LanguageSwitch />
        </div>
        <div className="ml-auto lg:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
