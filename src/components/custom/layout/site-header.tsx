import { Link } from "@tanstack/react-router";

import { site } from "@/sites";

import LanguageSwitch from "./language-switch";
import MainNav from "./main-nav";

export default function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
      <Link to="/" className="font-semibold">
        {site.name}
      </Link>
      <MainNav />
      <LanguageSwitch />
    </header>
  );
}
