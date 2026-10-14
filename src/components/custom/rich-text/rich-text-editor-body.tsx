import { CharacterCount } from "@tiptap/extension-character-count";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { useEffect } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import { cleanPastedHtml } from "@/lib/rich-text/clean-pasted-html";
import { DepthLimit } from "@/lib/rich-text/depth-limit";
import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";
import { richTextExtensions } from "@/lib/rich-text/extensions";
import { safeParseRichText } from "@/lib/rich-text/parse-rich-text";
import { m } from "@/paraglide/messages";
import type { RichTextDoc } from "@/typings/rich-text";

import { RICH_TEXT_CLASSES } from "./rich-text-classes";
import RichTextToolbar from "./rich-text-toolbar";

export interface IRichTextEditorProps {
  value: RichTextDoc | null;
  onChange: (doc: RichTextDoc) => void;
  // Character limit on text, counted the same way parseRichText counts it. Typing stops at the
  // limit; loaded content over it is kept and shown as over the limit, never trimmed.
  maxChars: number;
  // Accessible name of the editing area.
  label: string;
  disabled?: boolean;
  invalid?: boolean;
  lang?: string;
  onBlur?: () => void;
}

// Compared after normalising so attributes the validator drops do not look like a change.
function sameDoc(a: unknown, b: unknown) {
  const left = safeParseRichText(a)?.doc;
  const right = safeParseRichText(b)?.doc;
  return JSON.stringify(left) === JSON.stringify(right);
}

function editorAttributes(label: string, invalid?: boolean, lang?: string) {
  return {
    role: "textbox",
    "aria-multiline": "true",
    "aria-label": label,
    "aria-invalid": invalid ? "true" : "false",
    "data-slot": "input-group-control",
    class: `min-h-32 w-full px-2.5 py-2 outline-none ${RICH_TEXT_CLASSES}`,
    ...(lang ? { lang } : {}),
  };
}

export default function RichTextEditorBody({
  value,
  onChange,
  maxChars,
  label,
  disabled,
  invalid,
  lang,
  onBlur,
}: IRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      ...richTextExtensions,
      DepthLimit,
      CharacterCount.configure({ limit: maxChars, autoTrim: false }),
    ],
    content: value ?? EMPTY_RICH_TEXT,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: editorAttributes(label, invalid, lang),
      transformPastedHTML: cleanPastedHtml,
    },
    onUpdate: ({ editor: current }) =>
      onChange(current.getJSON() as RichTextDoc),
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (editor && editor.isEditable === disabled) {
      editor.setEditable(!disabled, false);
    }
  }, [editor, disabled]);

  // useEditor reads editorProps once, so label and validation changes are pushed in by hand.
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: editorAttributes(label, invalid, lang),
      },
    });
  }, [editor, label, invalid, lang]);

  // Form reset, discard or another entry: take the new value without echoing it back as an edit.
  useEffect(() => {
    if (!editor) return;
    const next = value ?? EMPTY_RICH_TEXT;
    if (!sameDoc(editor.getJSON(), next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  const counted = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current?.storage.characterCount.characters() ?? 0,
  });

  if (!editor) return null;
  const count = counted ?? 0;
  const over = count > maxChars;

  return (
    <InputGroup>
      <InputGroupAddon align="block-start">
        <RichTextToolbar editor={editor} disabled={disabled} />
      </InputGroupAddon>
      <EditorContent editor={editor} className="w-full" />
      <InputGroupAddon align="block-end">
        <InputGroupText
          className={over ? "text-destructive" : undefined}
          aria-live={over || count >= maxChars * 0.9 ? "polite" : "off"}
        >
          {m.editor_count({ count, max: maxChars })}
        </InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
