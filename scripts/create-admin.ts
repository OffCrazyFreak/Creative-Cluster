import "./load-env";

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
  },
});

if (!values.email || !values.name || !values.password) {
  console.error(
    "Usage: pnpm admin:create --email you@example.com --name 'Your Name' --password '...'",
  );
  process.exit(1);
}

const { auth } = await import("@/lib/auth/auth.server");

const { user } = await auth.api.createUser({
  body: {
    email: values.email,
    name: values.name,
    password: values.password,
    role: "admin",
    data: { emailVerified: true },
  },
});

console.log(`Created admin ${user.email} (${user.id})`);
process.exit(0);
