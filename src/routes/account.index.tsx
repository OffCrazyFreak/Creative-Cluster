import { createFileRoute } from "@tanstack/react-router";

import AccountHome from "@/features/account/components/account-home";

export const Route = createFileRoute("/account/")({
  component: AccountHome,
});
