import { z } from "zod";

import { LOCALES } from "@/constants/locales";
import { USER_ROLES } from "@/constants/roles";

export const inviteUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  role: z.enum(USER_ROLES),
  locale: z.enum(LOCALES),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const userIdSchema = z.object({ userId: z.uuid() });

export const setRoleSchema = userIdSchema.extend({ role: z.enum(USER_ROLES) });

export const banUserSchema = userIdSchema.extend({
  reason: z.string().trim().min(1).max(500),
});

export type UserActionError = "min_admins" | "exists" | "failed";
export type UserActionResult =
  { ok: true } | { ok: false; error: UserActionError };

export interface IAdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
}

export interface IAdminUsersData {
  users: IAdminUserRow[];
  activeAdmins: number;
}
