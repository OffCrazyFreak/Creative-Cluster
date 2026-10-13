import { Outlet } from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";
import SkipLink from "./skip-link";

export default function AppShell() {
  return (
    <TooltipProvider>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <SiteFooter />
      <Toaster />
    </TooltipProvider>
  );
}
