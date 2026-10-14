import { describe, expect, it } from "vitest";

import { PASSWORD_FIELDS } from "./password-hook.server";

describe("password hook coverage", () => {
  it("covers every endpoint that stores a password", () => {
    expect(Object.keys(PASSWORD_FIELDS).sort()).toEqual([
      "/admin/create-user",
      "/admin/set-user-password",
      "/change-password",
      "/reset-password",
      "/set-password",
      "/sign-up/email",
    ]);
  });
});
