import PendingConnectionsLink from "@/features/connections/components/pending-connections-link";
import { m } from "@/paraglide/messages";

export default function AccountHome() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">{m.common_nav_account()}</h1>
      <PendingConnectionsLink />
    </section>
  );
}
