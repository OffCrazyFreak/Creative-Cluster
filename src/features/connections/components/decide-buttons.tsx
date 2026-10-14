import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IDecideButtonsProps {
  name: string;
  busy: boolean;
  onDecide: (decision: "confirm" | "reject") => void;
}

export default function DecideButtons({
  name,
  busy,
  onDecide,
}: IDecideButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className="max-sm:min-h-11"
        disabled={busy}
        aria-label={m.connections_action_confirm_label({ name })}
        onClick={() => onDecide("confirm")}
      >
        {m.connections_action_confirm()}
      </Button>
      <Button
        variant="outline"
        className="max-sm:min-h-11"
        disabled={busy}
        aria-label={m.connections_action_reject_label({ name })}
        onClick={() => onDecide("reject")}
      >
        {m.connections_action_reject()}
      </Button>
    </div>
  );
}
