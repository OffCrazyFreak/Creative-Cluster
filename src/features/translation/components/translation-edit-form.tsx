import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import type { RichTextDoc } from "@/typings/rich-text";

import {
  ENTRY_TRANSLATION_KEY,
  saveTranslationMutationOptions,
} from "../translation-queries";
import {
  fromSerializableDoc,
  type ITranslationView,
  type TranslatedField,
} from "../translation-fields";
import TranslationEditFields, {
  type IEditValues,
} from "./translation-edit-fields";

interface ITranslationEditFormProps {
  view: ITranslationView;
}

export default function TranslationEditForm({
  view,
}: ITranslationEditFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [values, setValues] = useState<IEditValues>({
    description: fromSerializableDoc(view.texts.description?.doc),
    offering: view.texts.offering?.text ?? "",
    seeking: view.texts.seeking?.text ?? "",
  });
  // Only edited fields are sent: an untouched machine translation must stay machine.
  const [touched, setTouched] = useState<Set<TranslatedField>>(new Set());
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    ...saveTranslationMutationOptions(),
    onSuccess: async () => {
      setSaved(true);
      setTouched(new Set());
      await queryClient.invalidateQueries({
        queryKey: [ENTRY_TRANSLATION_KEY, view.entryId],
      });
      await router.invalidate();
    },
  });

  function change(field: TranslatedField, value: RichTextDoc | string) {
    setValues((current) => ({ ...current, [field]: value }));
    setTouched((current) => new Set(current).add(field));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    save.mutate({
      entryId: view.entryId,
      ...(touched.has("description")
        ? { description: values.description }
        : {}),
      ...(touched.has("offering") ? { offering: values.offering } : {}),
      ...(touched.has("seeking") ? { seeking: values.seeking } : {}),
    });
  }

  return (
    <form
      onSubmit={submit}
      lang={view.locale}
      className="flex flex-col gap-4"
      aria-labelledby="translation-edit-title"
    >
      <h3 id="translation-edit-title" className="font-semibold">
        {m.translation_edit_title()}
      </h3>
      <p className="text-sm">{m.translation_edit_hint()}</p>
      <TranslationEditFields view={view} values={values} onChange={change} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={save.isPending || touched.size === 0}>
          {m.translation_edit_save()}
        </Button>
        {saved ? <p role="status">{m.translation_edit_saved()}</p> : null}
        {save.isError ? <p role="alert">{m.translation_edit_error()}</p> : null}
      </div>
    </form>
  );
}
