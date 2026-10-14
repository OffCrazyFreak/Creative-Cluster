import { m } from "@/paraglide/messages";
import { REVIEW_STALE_DAYS } from "@/constants/moderation";

interface IApplySentProps {
  status: "verify" | "received";
  email: string;
}

export default function ApplySent({ status, email }: IApplySentProps) {
  return (
    <section
      className="flex flex-col gap-3"
      role="status"
      aria-labelledby="apply-sent-title"
    >
      <h2 id="apply-sent-title" className="text-xl font-semibold">
        {status === "verify" ? m.apply_sent_title() : m.apply_received_title()}
      </h2>
      <p>
        {status === "verify"
          ? m.apply_sent_body({ email })
          : m.apply_received_body({ days: REVIEW_STALE_DAYS })}
      </p>
    </section>
  );
}
