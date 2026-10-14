import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

export default function OpportunityGone() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {m.opportunities_detail_gone_title()}
      </h1>
      <p>{m.opportunities_detail_gone_body()}</p>
      <Link to="/opportunities">{m.opportunities_board_title()}</Link>
    </section>
  );
}
