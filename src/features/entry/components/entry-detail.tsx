import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import type { IPublicEntry } from "../entry-schemas";
import EntryAfterContentSlot from "./entry-after-content-slot";
import EntryContactSection from "./entry-contact-section";
import EntryContactSlot from "./entry-contact-slot";
import EntryFreshness from "./entry-freshness";
import EntryLocation, { placeLine } from "./entry-location";
import EntryReportSlot from "./entry-report-slot";
import EntryTags from "./entry-tags";

interface IEntryDetailProps {
  entry: IPublicEntry;
}

const kindLabels = {
  organization: () => m.entry_kind_organization(),
  person: () => m.entry_kind_person(),
  outside_partner: () => m.entry_kind_outside_partner(),
};

function TextSection({
  id,
  title,
  text,
}: {
  id: string;
  title: string;
  text: string;
}) {
  if (!text) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      <p className="whitespace-pre-line">{text}</p>
    </section>
  );
}

export default function EntryDetail({ entry }: IEntryDetailProps) {
  const slot = { entryId: entry.id, slug: entry.slug, name: entry.name };
  const place = placeLine(entry.location);

  return (
    <article className="flex flex-col gap-5">
      <Link to="/" className="inline-block self-start py-1 text-sm">
        {m.entry_back_to_results()}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{entry.name}</h1>
        <p>
          {[kindLabels[entry.kind](), place, entry.legalStatus]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>
      {entry.hasContactChannel ? (
        <div className="flex flex-wrap gap-2">
          <EntryContactSlot {...slot} />
        </div>
      ) : null}
      <TextSection
        id="entry-about"
        title={m.entry_section_about()}
        text={entry.descriptionText}
      />
      <TextSection
        id="entry-offering"
        title={m.entry_section_offering()}
        text={entry.offeringText}
      />
      <TextSection
        id="entry-seeking"
        title={m.entry_section_seeking()}
        text={entry.seekingText}
      />
      <EntryTags tags={entry.tags} />
      <EntryLocation location={entry.location} />
      <EntryContactSection entry={entry} />
      <EntryAfterContentSlot entryId={entry.id} slug={entry.slug} />
      <EntryFreshness
        updatedAt={entry.updatedAt}
        lastConfirmedAt={entry.lastConfirmedAt}
      />
      <div className="flex flex-wrap gap-2">
        <EntryReportSlot {...slot} />
      </div>
    </article>
  );
}
