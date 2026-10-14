import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import AdminNav from "@/components/custom/layout/admin-nav";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context, location }) => {
    if (!context.viewer) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (context.viewer.role !== "admin") throw redirect({ to: "/account" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <>
      <AdminNav />
      <Outlet />
    </>
  );
}
