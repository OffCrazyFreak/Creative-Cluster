import { Link } from "@tanstack/react-router";
import { useState } from "react";

import TranslatedSection from "@/features/translation/components/translated-section";
import TranslationNotice from "@/features/translation/components/translation-notice";
import type { ITranslationView } from "@/features/translation/translation-schemas";
import { m } from "@/paraglide/messages";

import type { IPublicEntry } from "../entry-schemas";
import EntryAfterContentSlot from "./entry-after-content-slot";
import EntryContactSection from "./entry-contact-section";
import EntryContactSlot from "./entry-contact-slot";
import EntryCover from "./entry-cover";
import EntryFreshness from "./entry-freshness";
import EntryLogo from "./entry-logo";
import EntryLocation, { placeLine } from "./entry-location";
import EntryReportSlot from "./entry-report-slot";
import EntryTags from "./entry-tags";

interface IEntryDetailProps {
  entry: IPublicEntry;
  translation: ITranslationView | null;
}

const kindLabels = {
  organization: () => m.entry_kind_organization(),
  person: () => m.entry_kind_person(),
  outside_partner: () => m.entry_kind_outside_partner(),
};

export default function EntryDetail({ entry, translation }: IEntryDetailProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const slot = { entryId: entry.id, slug: entry.slug, name: entry.name };
  const place = placeLine(entry.location);

  return (
    <article className="flex flex-col gap-5">
      <Link to="/" className="text-sm">
        {m.entry_back_to_results()}
      </Link>
      <EntryCover entry={entry} />
      <header className="flex items-center gap-4">
        <EntryLogo entry={entry} />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{entry.name}</h1>
          <p>
            {[kindLabels[entry.kind](), place, entry.legalStatus]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>
      {entry.hasContactChannel ? (
        <div className="flex flex-wrap gap-2">
          <EntryContactSlot {...slot} />
        </div>
      ) : null}
      {translation ? (
        <TranslationNotice
          view={translation}
          showOriginal={showOriginal}
          onToggleOriginal={() => setShowOriginal((shown) => !shown)}
        />
      ) : null}
      <TranslatedSection
        id="entry-about"
        title={m.entry_section_about()}
        field="description"
        text={entry.descriptionText}
        doc={entry.description}
        sourceLocale={entry.sourceLocale}
        view={translation}
        showOriginal={showOriginal}
      />
      <TranslatedSection
        id="entry-offering"
        title={m.entry_section_offering()}
        field="offering"
        text={entry.offeringText}
        sourceLocale={entry.sourceLocale}
        view={translation}
        showOriginal={showOriginal}
      />
      <TranslatedSection
        id="entry-seeking"
        title={m.entry_section_seeking()}
        field="seeking"
        text={entry.seekingText}
        sourceLocale={entry.sourceLocale}
        view={translation}
        showOriginal={showOriginal}
      />
      <EntryTags tags={entry.tags} />
      <EntryLocation location={entry.location} />
      <EntryContactSection entry={entry} />
      <EntryAfterContentSlot entryId={entry.id} />
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
