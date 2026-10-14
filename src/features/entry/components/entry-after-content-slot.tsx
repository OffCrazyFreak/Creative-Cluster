import EntryConnections from "@/features/connections/components/entry-connections";
import CollaborationCards from "@/features/matching/components/collaboration-cards";

interface IEntryAfterContentSlotProps {
  entryId: string;
}

// Sections below the entry text: connections first, then "Could collaborate with".
export default function EntryAfterContentSlot({
  entryId,
}: IEntryAfterContentSlotProps) {
  return (
    <>
      <EntryConnections entryId={entryId} />
      <CollaborationCards entryId={entryId} />
    </>
  );
}
