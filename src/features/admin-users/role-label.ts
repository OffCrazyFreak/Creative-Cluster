import type { UserRole } from "@/constants/roles";
import { m } from "@/paraglide/messages";

const ROLE_LABELS: Record<UserRole, () => string> = {
  admin: () => m.admin_users_role_admin(),
  member: () => m.admin_users_role_member(),
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole]?.() ?? role;
}
