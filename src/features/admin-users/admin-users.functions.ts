import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminGuard } from "@/server/guards";

import {
  banUserSchema,
  inviteUserSchema,
  setRoleSchema,
  userIdSchema,
} from "./admin-users-schemas";
import { inviteUser } from "./invite-user.server";
import {
  banUser,
  listUsers,
  removeUser,
  setUserRole,
  unbanUser,
} from "./admin-users.server";

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.void())
  .handler(() => listUsers());

export const inviteAdminUser = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(inviteUserSchema)
  .handler(({ data, context }) => inviteUser(data, context.user.id));

export const setAdminUserRole = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(setRoleSchema)
  .handler(({ data }) => setUserRole(data.userId, data.role));

export const banAdminUser = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(banUserSchema)
  .handler(({ data }) => banUser(data.userId, data.reason));

export const unbanAdminUser = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(userIdSchema)
  .handler(({ data }) => unbanUser(data.userId));

export const removeAdminUser = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(userIdSchema)
  .handler(({ data }) => removeUser(data.userId));
