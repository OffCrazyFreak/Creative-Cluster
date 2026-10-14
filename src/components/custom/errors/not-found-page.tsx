import { Link } from "@tanstack/react-router";

import PageContainer from "@/components/custom/layout/page-container";
import { m } from "@/paraglide/messages";

export default function NotFoundPage() {
  return (
    <PageContainer size="prose">
      <h1 className="text-2xl font-semibold">{m.common_not_found_title()}</h1>
      <p>{m.common_not_found_body()}</p>
      <Link to="/">{m.common_back_home()}</Link>
    </PageContainer>
  );
}
