import CollaborationCards from "@/features/matching/components/collaboration-cards";

interface IEntryAfterContentSlotProps {
  entryId: string;
  slug: string;
}

// Slot below the entry text for later sections (connections, mini graph); "Could collaborate with" is the first.
export default function EntryAfterContentSlot({
  entryId,
}: IEntryAfterContentSlotProps) {
  return <CollaborationCards entryId={entryId} />;
}
