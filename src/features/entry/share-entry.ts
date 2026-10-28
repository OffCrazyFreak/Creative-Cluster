import { toast } from "sonner";

import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { shareOrCopy } from "@/utils/share";

export async function shareEntry(entry: { slug: string; name: string }) {
  const url = new URL(localizeHref(`/e/${entry.slug}`), window.location.origin);
  const outcome = await shareOrCopy({ title: entry.name, url: url.href });
  if (outcome === "copied") toast.success(m.entry_share_copied());
  if (outcome === "failed") toast.error(m.entry_share_failed());
}
