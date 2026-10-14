interface IEntryAfterContentSlotProps {
  entryId: string;
  slug: string;
}

// Slot below the entry text for later sections: connections, mini graph, "Could collaborate with".
export default function EntryAfterContentSlot(
  props: IEntryAfterContentSlotProps,
) {
  void props;
  return null;
}
