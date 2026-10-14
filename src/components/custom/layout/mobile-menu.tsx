import { MenuIcon, XIcon } from "lucide-react";
import { useState, type MouseEvent } from "react";

import { useMediaQuery } from "@/features/map/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import AuthNav from "@/features/auth/components/auth-nav";
import { m } from "@/paraglide/messages";

import LanguageSwitch from "./language-switch";
import MainNav from "./main-nav";

// Below the lg breakpoint the links move into a side sheet; Base UI supplies the focus trap.
export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  // The portaled sheet outlives its hidden trigger when the window grows past lg.
  const desktop = useMediaQuery("(min-width: 1024px)", false);

  // Links close the sheet, including links to the page already open; log out stays until it finishes.
  function closeOnAction(event: MouseEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("a"))
      setOpen(false);
  }

  return (
    <Sheet open={open && !desktop} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="icon" />}
        aria-label={m.common_menu()}
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false}>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>{m.common_menu()}</SheetTitle>
          <SheetClose
            render={<Button variant="ghost" size="icon" />}
            aria-label={m.common_close()}
          >
            <XIcon />
          </SheetClose>
        </SheetHeader>
        <div
          onClick={closeOnAction}
          className="flex flex-col gap-4 overflow-y-auto px-4 pb-4 [&_a]:inline-block [&_a]:py-2"
        >
          <MainNav listClassName="flex-col items-stretch gap-x-0" />
          <AuthNav className="flex-col items-stretch gap-x-0" />
          <LanguageSwitch />
        </div>
      </SheetContent>
    </Sheet>
  );
}
