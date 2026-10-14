import EntryConnections from "@/features/connections/components/entry-connections";
import CollaborationCards from "@/features/matching/components/collaboration-cards";

interface IEntryAfterContentSlotProps {
  entryId: string;
}

// Slot below the entry text for later sections: connections first, then "Could collaborate with".
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
