import type { ReactNode } from "react";

import PageContainer from "@/components/custom/layout/page-container";

import MarkdownContent from "./markdown-content";

interface ILegalPageProps {
  source: string;
  children?: ReactNode;
}

export default function LegalPage({ source, children }: ILegalPageProps) {
  return (
    <PageContainer as="article" size="prose">
      <MarkdownContent source={source} />
      {children}
    </PageContainer>
  );
}
