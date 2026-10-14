import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context, location }) => {
    if (!context.viewer) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (context.viewer.role !== "admin") throw redirect({ to: "/account" });
  },
  component: Outlet,
});
