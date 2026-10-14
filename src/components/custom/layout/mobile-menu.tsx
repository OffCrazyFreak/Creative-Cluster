import { MenuIcon, XIcon } from "lucide-react";
import { useState, type MouseEvent } from "react";

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

  // Links and log out close the sheet, including links to the page already open.
  function closeOnAction(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a, button")) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
