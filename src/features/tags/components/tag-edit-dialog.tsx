import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages";

import { useAdminTagActions } from "../hooks/use-admin-tag-actions";
import type { IAdminTagRow } from "../tag-schemas";

interface ITagEditDialogProps {
  tag: IAdminTagRow;
  onClose: () => void;
}

function toLines(aliases: readonly string[]) {
  return aliases.join("\n");
}

function fromLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// Mounted per tag (keyed by id), so the fields start from the row being edited.
export default function TagEditDialog({ tag, onClose }: ITagEditDialogProps) {
  const { update } = useAdminTagActions();
  const [labelEn, setLabelEn] = useState(tag.labelEn);
  const [labelHr, setLabelHr] = useState(tag.labelHr);
  const [aliasesEn, setAliasesEn] = useState(toLines(tag.aliasesEn));
  const [aliasesHr, setAliasesHr] = useState(toLines(tag.aliasesHr));

  function save() {
    update.mutate(
      {
        data: {
          tagId: tag.id,
          labelEn,
          labelHr,
          aliasesEn: fromLines(aliasesEn),
          aliasesHr: fromLines(aliasesHr),
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.tags_admin_edit_title()}</DialogTitle>
          <DialogDescription>{tag.slug}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="tag-label-en">
            {m.tags_admin_label_en()}
          </FieldLabel>
          <Input
            id="tag-label-en"
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="tag-label-hr">
            {m.tags_admin_label_hr()}
          </FieldLabel>
          <Input
            id="tag-label-hr"
            value={labelHr}
            onChange={(e) => setLabelHr(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="tag-aliases-en">
            {m.tags_admin_aliases_en()}
          </FieldLabel>
          <Textarea
            id="tag-aliases-en"
            value={aliasesEn}
            onChange={(e) => setAliasesEn(e.target.value)}
          />
          <FieldDescription>{m.tags_admin_aliases_hint()}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="tag-aliases-hr">
            {m.tags_admin_aliases_hr()}
          </FieldLabel>
          <Textarea
            id="tag-aliases-hr"
            value={aliasesHr}
            onChange={(e) => setAliasesHr(e.target.value)}
          />
        </Field>
        {update.isError && <p role="alert">{m.tags_admin_error()}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {m.tags_admin_cancel()}
          </Button>
          <Button disabled={update.isPending} onClick={save}>
            {m.tags_admin_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
