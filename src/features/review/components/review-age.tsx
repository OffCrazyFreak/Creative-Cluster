import { Badge } from "@/components/ui/badge";
import { REVIEW_STALE_DAYS } from "@/constants/moderation";
import { m } from "@/paraglide/messages";

interface IReviewAgeProps {
  days: number;
  stale: boolean;
}

export default function ReviewAge({ days, stale }: IReviewAgeProps) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span>
        {days <= 0 ? m.review_age_today() : m.review_age_days({ count: days })}
      </span>
      {stale && (
        <Badge variant="destructive">
          {m.review_stale_badge({ days: REVIEW_STALE_DAYS })}
        </Badge>
      )}
    </div>
  );
}
