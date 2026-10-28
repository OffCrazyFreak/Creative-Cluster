import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { shareEntry } from "../share-entry";

interface IShareEntryButtonProps {
  entry: { slug: string; name: string };
}

// Sits inside the place line, so it widens its tap area past its small size.
export default function ShareEntryButton({ entry }: IShareEntryButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      aria-label={m.entry_share_label({ name: entry.name })}
      onClick={() => void shareEntry(entry)}
      className="relative ml-1.5 rounded-full align-middle after:absolute after:-inset-2"
    >
      <Share2 aria-hidden="true" />
      {m.entry_share()}
    </Button>
  );
}
