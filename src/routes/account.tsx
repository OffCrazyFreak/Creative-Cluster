import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

// Members and admins both own listings, so any logged-in viewer may enter.
export const Route = createFileRoute("/account")({
  beforeLoad: ({ context, location }) => {
    if (!context.viewer) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: Outlet,
});
