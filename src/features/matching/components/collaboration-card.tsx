import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";

import type {
  ICollaborationCard,
  IMatchPerspective,
} from "../matching-schemas";
import MatchReasonLine from "./match-reason-line";

interface ICollaborationCardProps {
  card: ICollaborationCard;
  locale: AppLocale;
  perspective: IMatchPerspective;
}

export default function CollaborationCardItem({
  card,
  locale,
  perspective,
}: ICollaborationCardProps) {
  const place = [card.city, card.countryCode].filter(Boolean).join(", ");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link to="/e/$slug" params={{ slug: card.slug }}>
            {card.name}
          </Link>
        </CardTitle>
        {place && <CardDescription>{place}</CardDescription>}
        {card.strength && (
          <Badge variant={card.strength === "strong" ? "default" : "secondary"}>
            {card.strength === "strong"
              ? m.matching_strength_strong()
              : m.matching_strength_possible()}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {card.reasons.map((reason) => (
          <MatchReasonLine
            key={reason.relation}
            reason={reason}
            locale={locale}
            perspective={perspective}
          />
        ))}
      </CardContent>
    </Card>
  );
}
