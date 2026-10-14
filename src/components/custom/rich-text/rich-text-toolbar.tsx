import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Link } from "lucide-react";
import { useState } from "react";

import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { m } from "@/paraglide/messages";

import {
  BLOCK_ITEMS,
  STYLE_ITEMS,
  isCommandActive,
  runCommand,
  type IRichTextToolbarItem,
  type RichTextCommand,
} from "./rich-text-commands";
import RichTextLinkDialog from "./rich-text-link-dialog";

interface IRichTextToolbarProps {
  editor: Editor;
  disabled?: boolean;
}

interface ICommandGroupProps {
  editor: Editor;
  disabled?: boolean;
  label: string;
  items: IRichTextToolbarItem[];
}

function CommandGroup({ editor, label, items, disabled }: ICommandGroupProps) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      items
        .map((item) => item.command)
        .filter((command) => isCommandActive(current, command)),
  });

  function change(next: string[]) {
    const all = new Set<string>([...active, ...next]);
    for (const command of all) {
      if (
        active.includes(command as RichTextCommand) !== next.includes(command)
      ) {
        runCommand(editor, command as RichTextCommand);
      }
    }
  }

  return (
    <ToggleGroup
      multiple
      disabled={disabled}
      aria-label={label}
      value={active}
      onValueChange={change}
      spacing={1}
    >
      {items.map(({ command, icon: Icon, label: itemLabel }) => (
        <ToggleGroupItem
          key={command}
          value={command}
          aria-label={itemLabel()}
          title={itemLabel()}
        >
          <Icon aria-hidden />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export default function RichTextToolbar({
  editor,
  disabled,
}: IRichTextToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const linkActive = useEditorState({
    editor,
    selector: ({ editor: current }) => current.isActive("link"),
  });

  return (
    <div
      role="toolbar"
      aria-label={m.editor_toolbar_label()}
      className="flex flex-wrap items-center gap-1"
    >
      <CommandGroup
        editor={editor}
        disabled={disabled}
        label={m.editor_group_styles()}
        items={STYLE_ITEMS}
      />
      <CommandGroup
        editor={editor}
        disabled={disabled}
        label={m.editor_group_blocks()}
        items={BLOCK_ITEMS}
      />
      <Toggle
        pressed={linkActive}
        disabled={disabled}
        onPressedChange={() => setLinkOpen(true)}
        aria-label={m.editor_link()}
        title={m.editor_link()}
      >
        <Link aria-hidden />
      </Toggle>
      {linkOpen && !disabled ? (
        <RichTextLinkDialog
          editor={editor}
          open={linkOpen}
          onOpenChange={setLinkOpen}
        />
      ) : null}
    </div>
  );
}
