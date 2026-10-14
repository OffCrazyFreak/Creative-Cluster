import type { UserRole } from "@/constants/roles";

// The admin plugin's types only know "admin" and "user"; our member role is stored as plain text.
export function pluginRole(role: UserRole) {
  return role as "admin" | "user";
}
