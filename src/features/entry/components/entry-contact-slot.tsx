import ContactDialog from "@/features/contact/components/contact-dialog";

interface IEntryContactSlotProps {
  entryId: string;
  slug: string;
  name: string;
}

export default function EntryContactSlot({
  entryId,
  name,
}: IEntryContactSlotProps) {
  return <ContactDialog entryId={entryId} name={name} />;
}
