import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { publicOpportunitiesQuery } from "../opportunity-queries";
import { boardInput } from "../opportunity-board-input";
import OpportunityFilters from "./opportunity-filters";
import OpportunityListItem from "./opportunity-list-item";

// The list is the primary interface; the map frame around it only adds pins.
export default function OpportunitiesBoard() {
  const search = useSearch({ from: "/_map/opportunities/" });
  const { data } = useSuspenseQuery(
    publicOpportunitiesQuery(boardInput(search, getLocale())),
  );

  return (
    <section aria-labelledby="board-heading" className="flex flex-col gap-4">
      <h1 id="board-heading" className="text-2xl font-semibold">
        {m.opportunities_board_title()}
      </h1>
      <p>{m.opportunities_board_intro()}</p>
      <OpportunityFilters search={search} facets={data.facets} />
      <p role="status" className="font-semibold">
        {m.opportunities_board_count({ count: data.total })}
      </p>
      {data.total > data.items.length ? (
        <p className="text-sm">
          {m.opportunities_board_truncated({ shown: data.items.length })}
        </p>
      ) : null}
      {data.items.length === 0 ? (
        <p>{m.opportunities_board_empty()}</p>
      ) : (
        <ul
          aria-label={m.opportunities_board_list_label()}
          className="flex flex-col gap-5"
        >
          {data.items.map((item) => (
            <OpportunityListItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
