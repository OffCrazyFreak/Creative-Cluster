import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import PageContainer from "@/components/custom/layout/page-container";
import { m } from "@/paraglide/messages";

export default function ErrorPage({ reset }: ErrorComponentProps) {
  const router = useRouter();

  // reset() alone re-renders the cached error; invalidate() re-runs the loaders.
  async function retry() {
    await router.invalidate();
    reset();
  }

  return (
    <PageContainer size="prose">
      <h1 className="text-2xl font-semibold">{m.common_error_title()}</h1>
      <p>{m.common_error_body()}</p>
      <Button className="self-start" onClick={() => void retry()}>
        {m.common_try_again()}
      </Button>
    </PageContainer>
  );
}
