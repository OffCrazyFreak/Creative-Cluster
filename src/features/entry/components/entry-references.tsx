import RichTextView from "@/components/custom/rich-text/rich-text-view";
import { m } from "@/paraglide/messages";
import type { JsonRichTextDoc } from "@/typings/rich-text";

interface IEntryReferencesProps {
  doc: JsonRichTextDoc | null;
}

export default function EntryReferences({ doc }: IEntryReferencesProps) {
  if (!doc) return null;
  return (
    <section aria-labelledby="entry-references" className="flex flex-col gap-2">
      <h2 id="entry-references" className="font-semibold">
        {m.entry_section_references()}
      </h2>
      <RichTextView doc={doc} />
    </section>
  );
}
