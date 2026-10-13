import { useQuery } from "@tanstack/react-query";

import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { collaborationQuery } from "../matching-queries";
import CollaborationCardItem from "./collaboration-card";

export interface ICollaborationCardsProps {
  /** The entry whose page is shown. Its owner opting out of matching yields no cards. */
  entryId: string;
  locale?: AppLocale;
}

// Renders nothing while loading, on error or when there is no match, so the entry page never shows an empty box.
export default function CollaborationCards({
  entryId,
  locale = getLocale(),
}: ICollaborationCardsProps) {
  const { data } = useQuery(collaborationQuery(entryId));
  if (!data || data.cards.length === 0) return null;

  return (
    <section
      aria-labelledby="collaboration-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="collaboration-heading" className="text-lg font-semibold">
        {data.mode === "collaborate"
          ? m.matching_heading_collaborate()
          : m.matching_heading_similar()}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {data.cards.map((card) => (
          <li key={card.entryId}>
            <CollaborationCardItem card={card} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
