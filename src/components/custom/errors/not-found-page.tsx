import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">{m.common_not_found_title()}</h1>
      <p>{m.common_not_found_body()}</p>
      <Link to="/">{m.common_back_home()}</Link>
    </section>
  );
}
