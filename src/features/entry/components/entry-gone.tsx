import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

export default function EntryGone() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{m.entry_gone_title()}</h1>
      <p>{m.entry_gone_body()}</p>
      <Link to="/directory">{m.common_nav_directory()}</Link>
    </section>
  );
}
