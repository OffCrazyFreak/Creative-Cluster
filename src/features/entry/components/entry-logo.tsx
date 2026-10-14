import EntryImage from "@/features/images/components/entry-image";

import type { IPublicEntry } from "../entry-schemas";

interface IEntryLogoProps {
  entry: IPublicEntry;
}

const LOGO_SIZE = 96;

export default function EntryLogo({ entry }: IEntryLogoProps) {
  if (!entry.logo) return null;
  return (
    <EntryImage
      image={entry.logo}
      alt={entry.logo.altText ?? entry.name}
      width={LOGO_SIZE}
      height={LOGO_SIZE}
      className="size-24 shrink-0 object-contain"
      eager={!entry.cover}
    />
  );
}
