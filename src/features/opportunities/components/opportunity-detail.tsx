import { Link } from "@tanstack/react-router";
import { useState } from "react";

import RichTextView from "@/components/custom/rich-text/rich-text-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { AppLocale } from "@/constants/locales";
import { countryName } from "@/features/directory/country-name";
import ContactDialog from "@/features/contact/components/contact-dialog";
import EntryImage from "@/features/images/components/entry-image";
import { tagLabel } from "@/features/tags/tag-label";
import { fromSerializableDoc } from "@/features/translation/translation-schemas";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatDate } from "@/utils/format-date";

import { categoryLabel, typeLabel } from "../opportunity-labels";
import type { IOpportunityPage } from "../opportunity-page-schemas";
import OpportunityReportButton from "./opportunity-report-button";
import OpportunityTranslationNotice from "./opportunity-translation-notice";

interface IOpportunityDetailProps {
  opportunity: IOpportunityPage;
}

const LOGO_SIZE = 48;

export default function OpportunityDetail({
  opportunity,
}: IOpportunityDetailProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const locale = getLocale();
  const { entry, translation } = opportunity;
  const source = opportunity.sourceLocale as AppLocale;
  // The translated text is shown unless the reader asks for the owner's original.
  const translated = showOriginal ? null : translation;
  const title = translated?.title ?? opportunity.title;
  const titleLang = translated?.title ? locale : source;
  const bodyDoc = fromSerializableDoc(translated?.body ?? opportunity.body);
  const bodyLang = translated?.body ? locale : source;
  const place = [
    entry.city,
    entry.country ? countryName(entry.country, locale) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="flex flex-col gap-5">
      <Link
        to="/opportunities"
        className="inline-block self-start py-1 text-sm"
      >
        {m.opportunities_detail_back()}
      </Link>
      {opportunity.state !== "active" ? (
        <Alert role="status">
          <AlertDescription>
            {opportunity.state === "filled"
              ? m.opportunities_detail_banner_filled()
              : m.opportunities_detail_banner_expired()}
          </AlertDescription>
        </Alert>
      ) : null}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold" lang={titleLang}>
          {title}
        </h1>
        <ul className="flex flex-wrap gap-1">
          {opportunity.state === "filled" ? (
            <li>
              <Badge>{m.opportunities_item_filled()}</Badge>
            </li>
          ) : null}
          <li>
            <Badge variant="outline">{typeLabel(opportunity.type)}</Badge>
          </li>
          <li>
            <Badge variant="outline">
              {categoryLabel(opportunity.category)}
            </Badge>
          </li>
          {opportunity.remoteOk ? (
            <li>
              <Badge variant="outline">{m.opportunities_detail_remote()}</Badge>
            </li>
          ) : null}
        </ul>
        {opportunity.state === "active" ? (
          <p className="text-sm">
            {opportunity.deadline
              ? m.opportunities_item_closes({
                  date: formatDate(opportunity.deadline),
                })
              : m.opportunities_item_open_until({
                  date: formatDate(opportunity.expiresAt),
                })}
          </p>
        ) : null}
      </header>
      <OpportunityTranslationNotice
        sourceLocale={source}
        origin={translation?.origin ?? null}
        missing={opportunity.translationMissing}
        showOriginal={showOriginal}
        onToggleOriginal={() => setShowOriginal((shown) => !shown)}
      />
      <section aria-labelledby="opp-about" className="flex flex-col gap-1">
        <h2 id="opp-about" className="font-semibold">
          {m.opportunities_detail_section_about()}
        </h2>
        <RichTextView doc={bodyDoc} lang={bodyLang} />
      </section>
      {opportunity.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {opportunity.tags.map((item) => (
            <li key={item.slug}>
              <Badge variant="secondary">{tagLabel(item, locale)}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <section aria-labelledby="opp-entry" className="flex flex-col gap-3">
        <h2 id="opp-entry" className="font-semibold">
          {m.opportunities_detail_posted_by()}
        </h2>
        <div className="flex items-center gap-3">
          {entry.logo ? (
            <EntryImage
              image={entry.logo}
              alt=""
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              className="size-12 shrink-0 object-contain"
            />
          ) : null}
          <div className="flex min-w-0 flex-col">
            <Link
              to="/e/$slug"
              params={{ slug: entry.slug }}
              className="inline-block py-1 font-semibold"
            >
              {entry.name}
            </Link>
            {place ? <span className="text-sm">{place}</span> : null}
          </div>
        </div>
        {opportunity.state === "active" ? (
          <>
            <p className="text-sm">
              {m.opportunities_detail_can_help_hint({ name: entry.name })}
            </p>
            {entry.hasContactChannel ? (
              <div className="flex self-start">
                <ContactDialog
                  entryId={entry.id}
                  name={entry.name}
                  triggerLabel={m.opportunities_detail_can_help()}
                />
              </div>
            ) : (
              <Link
                to="/e/$slug"
                params={{ slug: entry.slug }}
                className={cn(buttonVariants(), "self-start")}
              >
                {m.opportunities_detail_view_listing()}
              </Link>
            )}
          </>
        ) : null}
      </section>
      <div className="flex flex-wrap gap-2">
        <OpportunityReportButton id={opportunity.id} />
      </div>
    </article>
  );
}
