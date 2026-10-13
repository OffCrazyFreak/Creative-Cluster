import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export default function ErrorPage({ reset }: ErrorComponentProps) {
  const router = useRouter();

  // reset() alone re-renders the cached error; invalidate() re-runs the loaders.
  async function retry() {
    await router.invalidate();
    reset();
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">{m.common_error_title()}</h1>
      <p>{m.common_error_body()}</p>
      <Button className="self-start" onClick={() => void retry()}>
        {m.common_try_again()}
      </Button>
    </section>
  );
}
