import { m } from "@/paraglide/messages";
import { safeHttpUrl, USER_LINK_REL } from "@/utils/safe-url";

import type { IPublicEntry } from "../entry-schemas";

interface IEntryContactSectionProps {
  entry: IPublicEntry;
}

function ExternalLink({ href, label }: { href: string; label?: string }) {
  const safe = safeHttpUrl(href);
  if (!safe) return null;
  return (
    <a href={safe} rel={USER_LINK_REL} target="_blank">
      {label ?? safe.replace(/^https?:\/\//, "")}
    </a>
  );
}

// Only fields the viewer may see arrive here; redaction happens on the server.
export default function EntryContactSection({
  entry,
}: IEntryContactSectionProps) {
  const socials = Object.entries(entry.socials).filter(([, url]) =>
    safeHttpUrl(url),
  );
  const rows = [
    entry.website && {
      label: m.entry_website(),
      value: <ExternalLink href={entry.website} />,
    },
    entry.contactName && {
      label: m.entry_contact_name(),
      value: entry.contactName,
    },
    entry.contactEmail && {
      label: m.entry_contact_email(),
      value: <a href={`mailto:${entry.contactEmail}`}>{entry.contactEmail}</a>,
    },
    entry.contactPhone && {
      label: m.entry_contact_phone(),
      value: (
        <a href={`tel:${entry.contactPhone.replace(/\s+/g, "")}`}>
          {entry.contactPhone}
        </a>
      ),
    },
    socials.length > 0 && {
      label: m.entry_socials(),
      value: (
        <ul className="flex flex-wrap gap-x-3">
          {socials.map(([network, url]) => (
            <li key={network}>
              <ExternalLink href={url} label={network} />
            </li>
          ))}
        </ul>
      ),
    },
  ].filter((row) => row !== false && row !== null && row !== "");
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="entry-contact" className="flex flex-col gap-2">
      <h2 id="entry-contact" className="font-semibold">
        {m.entry_section_contact()}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map((row) =>
          row ? (
            <div key={row.label} className="contents">
              <dt>{row.label}</dt>
              <dd className="break-words">{row.value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
