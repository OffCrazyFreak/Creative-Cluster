import type { ReactNode } from "react";

import MarkdownContent from "./markdown-content";

interface ILegalPageProps {
  source: string;
  children?: ReactNode;
}

export default function LegalPage({ source, children }: ILegalPageProps) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <MarkdownContent source={source} />
      {children}
    </article>
  );
}
