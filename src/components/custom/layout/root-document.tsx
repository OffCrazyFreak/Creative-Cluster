import { HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { getLocale } from "@/paraglide/runtime";
import { site } from "@/sites";

interface IRootDocumentProps {
  children: ReactNode;
}

export default function RootDocument({ children }: IRootDocumentProps) {
  return (
    <html lang={getLocale()} data-site={site.id}>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
