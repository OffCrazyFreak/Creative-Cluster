import RichTextView from "@/components/custom/rich-text/rich-text-view";
import type { RichTextDoc } from "@/typings/rich-text";

interface IEntryTextSectionProps {
  id: string;
  title: string;
  text: string;
  // Stored rich text; when present it replaces the plain text.
  doc?: RichTextDoc | null;
  lang?: string;
}

export default function EntryTextSection({
  id,
  title,
  text,
  doc,
  lang,
}: IEntryTextSectionProps) {
  if (!doc && !text) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {doc ? (
        <RichTextView doc={doc} lang={lang} />
      ) : (
        <p className="whitespace-pre-line">{text}</p>
      )}
    </section>
  );
}
