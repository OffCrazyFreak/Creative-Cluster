import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OPPORTUNITY_LIMITS } from "@/constants/opportunities";
import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

import { lastOpenDay } from "../opportunity-expiry";
import {
  categoryLabel,
  reasonLabel,
  stateLabel,
  typeLabel,
} from "../opportunity-labels";
import type {
  IOwnOpportunity,
  OwnOpportunityState,
} from "../opportunity-types";
import FillOpportunityDialog from "./fill-opportunity-dialog";
import RenewOpportunityForm from "./renew-opportunity-form";

interface IOwnOpportunityCardProps {
  item: IOwnOpportunity;
  busy: boolean;
  onEdit: () => void;
  onRenew: (deadline?: string) => void;
  onFill: () => void;
}

const LIVE: readonly OwnOpportunityState[] = ["active", "expiring_soon"];
const CLOSED: readonly OwnOpportunityState[] = ["filled", "removed"];
const HAS_PAGE: readonly OwnOpportunityState[] = [
  "active",
  "expiring_soon",
  "expired",
  "filled",
];
// The service lets the owner close any published post, expired ones included.
const CAN_FILL: readonly OwnOpportunityState[] = [...LIVE, "expired"];

export default function OwnOpportunityCard({
  item,
  busy,
  onEdit,
  onRenew,
  onFill,
}: IOwnOpportunityCardProps) {
  const warn = item.state === "expiring_soon" || item.state === "expired";
  const editable = !CLOSED.includes(item.state);
  const publicPage = HAS_PAGE.includes(item.state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <h3>{item.title}</h3>
          <Badge variant={warn ? "destructive" : "secondary"}>
            {stateLabel(item.state)}
          </Badge>
        </CardTitle>
        <p>
          {typeLabel(item.type)} · {categoryLabel(item.category)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        {item.state === "expired" ? (
          <p>
            {m.opportunities_expired_on({ date: formatDate(item.expiresAt) })}
          </p>
        ) : LIVE.includes(item.state) ? (
          <p>
            {m.opportunities_open_until({
              date: formatDate(lastOpenDay(new Date(item.expiresAt))),
            })}
          </p>
        ) : null}
        {item.deadline ? (
          <p>{m.opportunities_deadline({ date: formatDate(item.deadline) })}</p>
        ) : null}
        {item.renewals > 0 ? (
          <p>
            {m.opportunities_renewals({
              count: item.renewals,
              max: OPPORTUNITY_LIMITS.maxRenewals,
            })}
          </p>
        ) : null}
        {item.reasonCode ? (
          <p>
            {m.opportunities_reason({ reason: reasonLabel(item.reasonCode) })}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap items-end gap-2">
        {publicPage ? (
          <Link
            to="/opportunities/$id"
            params={{ id: item.id }}
            className={buttonVariants({ variant: "outline" })}
          >
            {m.opportunities_action_view()}
          </Link>
        ) : null}
        {editable ? (
          <Button type="button" variant="outline" onClick={onEdit}>
            {m.opportunities_action_edit()}
          </Button>
        ) : null}
        {item.canRenew ? (
          <RenewOpportunityForm
            hasDeadline={Boolean(item.deadline)}
            disabled={busy}
            onRenew={onRenew}
          />
        ) : null}
        {CAN_FILL.includes(item.state) ? (
          <FillOpportunityDialog disabled={busy} onConfirm={onFill} />
        ) : null}
      </CardFooter>
    </Card>
  );
}
