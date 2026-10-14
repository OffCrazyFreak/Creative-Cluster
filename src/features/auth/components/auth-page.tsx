import type { ReactNode } from "react";

import PageContainer from "@/components/custom/layout/page-container";

interface IAuthPageProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

export default function AuthPage({ title, intro, children }: IAuthPageProps) {
  return (
    <PageContainer size="narrow">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {intro && <p>{intro}</p>}
      {children}
    </PageContainer>
  );
}
