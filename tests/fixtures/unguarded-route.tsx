// Deliberately broken: proves the guard test fails on each rule.
import { createServerFn } from "@tanstack/react-start";

export const leaky = createServerFn({ method: "POST" }).handler(() => "secret");

export const Route = {
  server: { handlers: { GET: () => new Response("open") } },
};
