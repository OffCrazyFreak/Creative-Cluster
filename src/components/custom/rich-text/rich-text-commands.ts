import type { Editor } from "@tiptap/core";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline,
  type LucideIcon,
} from "lucide-react";

import { m } from "@/paraglide/messages";

export type RichTextCommand =
  | "bold"
  | "italic"
  | "underline"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "blockquote";

export interface IRichTextToolbarItem {
  command: RichTextCommand;
  icon: LucideIcon;
  label: () => string;
}

export const STYLE_ITEMS: IRichTextToolbarItem[] = [
  { command: "bold", icon: Bold, label: () => m.editor_bold() },
  { command: "italic", icon: Italic, label: () => m.editor_italic() },
  { command: "underline", icon: Underline, label: () => m.editor_underline() },
];

export const BLOCK_ITEMS: IRichTextToolbarItem[] = [
  { command: "heading2", icon: Heading2, label: () => m.editor_heading_2() },
  { command: "heading3", icon: Heading3, label: () => m.editor_heading_3() },
  { command: "bulletList", icon: List, label: () => m.editor_bullet_list() },
  {
    command: "orderedList",
    icon: ListOrdered,
    label: () => m.editor_ordered_list(),
  },
  { command: "blockquote", icon: Quote, label: () => m.editor_blockquote() },
];

export function isCommandActive(editor: Editor, command: RichTextCommand) {
  if (command === "heading2") return editor.isActive("heading", { level: 2 });
  if (command === "heading3") return editor.isActive("heading", { level: 3 });
  return editor.isActive(command);
}

export function runCommand(editor: Editor, command: RichTextCommand) {
  if (!editor.isEditable) return;
  const chain = editor.chain().focus();
  if (command === "bold") chain.toggleBold();
  if (command === "italic") chain.toggleItalic();
  if (command === "underline") chain.toggleUnderline();
  if (command === "heading2") chain.toggleHeading({ level: 2 });
  if (command === "heading3") chain.toggleHeading({ level: 3 });
  if (command === "bulletList") chain.toggleBulletList();
  if (command === "orderedList") chain.toggleOrderedList();
  if (command === "blockquote") chain.toggleBlockquote();
  chain.run();
}
