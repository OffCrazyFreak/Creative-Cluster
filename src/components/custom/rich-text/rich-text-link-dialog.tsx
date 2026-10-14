import type { Editor } from "@tiptap/core";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";
import { normalizeHttpUrl } from "@/utils/http-url";

interface IRichTextLinkDialogProps {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function applyLink(editor: Editor, href: string) {
  const chain = editor.chain().focus();
  if (editor.state.selection.empty && !editor.isActive("link")) {
    chain
      .insertContent({
        type: "text",
        text: href,
        marks: [{ type: "link", attrs: { href } }],
      })
      .run();
    return;
  }
  chain.extendMarkRange("link").setLink({ href }).run();
}

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const current = (editor.getAttributes("link").href as string) ?? "";
  const [value, setValue] = useState(current);
  const [invalid, setInvalid] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    const href = normalizeHttpUrl(value);
    if (!href) return setInvalid(true);
    applyLink(editor, href);
    onDone();
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onDone();
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor="rich-text-link-url">
          {m.editor_link_url()}
        </FieldLabel>
        <Input
          id="rich-text-link-url"
          inputMode="url"
          autoComplete="off"
          value={value}
          aria-invalid={invalid}
          onChange={(event) => {
            setValue(event.target.value);
            setInvalid(false);
          }}
        />
        <FieldDescription>{m.editor_link_hint()}</FieldDescription>
        {invalid ? <FieldError>{m.editor_link_invalid()}</FieldError> : null}
      </Field>
      <DialogFooter>
        {current ? (
          <Button type="button" variant="outline" onClick={remove}>
            {m.editor_link_remove()}
          </Button>
        ) : null}
        <Button type="submit">{m.editor_link_apply()}</Button>
      </DialogFooter>
    </form>
  );
}

export default function RichTextLinkDialog({
  editor,
  open,
  onOpenChange,
}: IRichTextLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.editor_link_title()}</DialogTitle>
          <DialogDescription>{m.editor_link_description()}</DialogDescription>
        </DialogHeader>
        <LinkForm editor={editor} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
