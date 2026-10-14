import EntryImage from "@/features/images/components/entry-image";

import type { IPublicEntry } from "../entry-schemas";

interface IEntryCoverProps {
  entry: IPublicEntry;
}

const COVER_WIDTH = 768;
const COVER_HEIGHT = 256;

export default function EntryCover({ entry }: IEntryCoverProps) {
  if (!entry.cover) return null;
  return (
    <EntryImage
      image={entry.cover}
      alt={entry.cover.altText ?? ""}
      width={COVER_WIDTH}
      height={COVER_HEIGHT}
      className="h-64 w-full max-w-3xl object-cover"
      eager
    />
  );
}
