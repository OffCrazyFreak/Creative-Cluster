import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { IConnectionItem } from "../connections-schemas";
import {
  decideConnection,
  decideUnclaimedProposal,
  withdrawConnection,
} from "../connections.functions";
import { useConnectionAction } from "../hooks/use-connection-action";
import WithdrawDialog from "./withdraw-dialog";

interface IConnectionActionsProps {
  item: IConnectionItem;
  // An admin deciding for a listing that has no owner.
  onBehalf?: boolean;
}

export default function ConnectionActions({
  item,
  onBehalf = false,
}: IConnectionActionsProps) {
  const { run, busy } = useConnectionAction();
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const name = item.other.name;
  const decide = onBehalf ? decideUnclaimedProposal : decideConnection;
  const waitingForMe = item.status === "proposed" && item.role === "recipient";

  if (waitingForMe) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          className="max-sm:min-h-11"
          disabled={busy}
          aria-label={m.connections_action_confirm_label({ name })}
          onClick={() =>
            void run(
              () => decide({ data: { linkId: item.id, decision: "confirm" } }),
              m.connections_done_confirm(),
            )
          }
        >
          {m.connections_action_confirm()}
        </Button>
        <Button
          variant="outline"
          className="max-sm:min-h-11"
          disabled={busy}
          aria-label={m.connections_action_reject_label({ name })}
          onClick={() =>
            void run(
              () => decide({ data: { linkId: item.id, decision: "reject" } }),
              m.connections_done_reject(),
            )
          }
        >
          {m.connections_action_reject()}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className="max-sm:min-h-11"
        disabled={busy}
        aria-label={m.connections_action_withdraw_label({ name })}
        onClick={() => setConfirmingWithdraw(true)}
      >
        {m.connections_action_withdraw()}
      </Button>
      <WithdrawDialog
        open={confirmingWithdraw}
        busy={busy}
        onOpenChange={setConfirmingWithdraw}
        onConfirm={() =>
          void run(
            () => withdrawConnection({ data: { linkId: item.id } }),
            m.connections_done_withdraw(),
          ).then((done) => done && setConfirmingWithdraw(false))
        }
      />
    </>
  );
}
