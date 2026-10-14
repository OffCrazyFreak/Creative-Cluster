import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { TAG_FIELDS, type TagField } from "@/constants/tags";
import { tagLabel } from "@/features/directory/tag-label";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { ITagRef } from "../entry-schemas";

interface IEntryTagsProps {
  tags: ITagRef[];
}

const headings: Record<TagField, () => string> = {
  topic: () => m.entry_tag_topic(),
  offering: () => m.entry_tag_offering(),
  seeking: () => m.entry_tag_seeking(),
};

export default function EntryTags({ tags }: IEntryTagsProps) {
  const locale = getLocale();
  const groups = TAG_FIELDS.map((field) => ({
    field,
    items: tags.filter((item) => item.field === field),
  })).filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="entry-tags" className="flex flex-col gap-2">
      <h2 id="entry-tags" className="font-semibold">
        {m.entry_section_tags()}
      </h2>
      {groups.map((group) => (
        <div key={group.field} className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{headings[group.field]()}</span>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <li key={item.id}>
                <Badge
                  variant="secondary"
                  className="h-6"
                  render={
                    <Link
                      to="/directory/tag/$tag"
                      params={{ tag: item.slug }}
                    />
                  }
                >
                  {tagLabel(item, locale)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
