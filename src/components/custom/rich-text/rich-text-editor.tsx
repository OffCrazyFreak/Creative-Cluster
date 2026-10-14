import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { m } from "@/paraglide/messages";

import type { IRichTextEditorProps } from "./rich-text-editor-body";

export type { IRichTextEditorProps };

const RichTextEditorBody = lazy(() => import("./rich-text-editor-body"));

// Tiptap and ProseMirror only load in the browser, on pages that edit text.
export default function RichTextEditor(props: IRichTextEditorProps) {
  const isClient = useIsClient();
  const fallback = (
    <Skeleton
      className="h-40 w-full"
      role="status"
      aria-label={m.editor_loading()}
    />
  );
  if (!isClient) return fallback;
  return (
    <Suspense fallback={fallback}>
      <RichTextEditorBody {...props} />
    </Suspense>
  );
}
