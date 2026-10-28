import { Link, useRouteContext } from "@tanstack/react-router";
import { LogIn, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

// Icon only: a worded login pill leaves the search too narrow on a 360 px phone.
export default function MapAccountButton() {
  const { viewer } = useRouteContext({ from: "__root__" });
  const label = viewer ? m.common_nav_account() : m.common_nav_login();

  return (
    <Button
      variant="ghost"
      size="icon"
      nativeButton={false}
      aria-label={label}
      title={label}
      render={<Link to={viewer ? "/account" : "/login"} />}
    >
      {viewer ? <UserRound aria-hidden="true" /> : <LogIn aria-hidden="true" />}
    </Button>
  );
}
