import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IFillOpportunityDialogProps {
  disabled: boolean;
  onConfirm: () => void;
}

export default function FillOpportunityDialog({
  disabled,
  onConfirm,
}: IFillOpportunityDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button type="button" variant="outline" disabled={disabled} />}
      >
        {m.opportunities_action_fill()}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.opportunities_fill_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.opportunities_fill_body()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {m.opportunities_action_cancel()}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {m.opportunities_action_fill()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
