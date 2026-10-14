import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import PageContainer from "@/components/custom/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages";

import { IMPORT_FILE_MAX_CHARS } from "../import-admin-schemas";
import type { IImportPlan, ImportFileError } from "../import-plan-codes";
import { previewImportFile, runImportFile } from "../import.functions";
import { UNPINNED_IMPORTS_QUERY_KEY } from "../import-queries";
import ImportPlanView from "./import-plan-view";
import UnpinnedTable from "./unpinned-table";

function failureText(error: ImportFileError, issues: string[]): string {
  if (error === "invalid_json") return m.import_error_json();
  if (error === "wrong_site") return m.import_error_site();
  return `${m.import_error_file()} ${issues.filter(Boolean).join(", ")}`.trim();
}

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [json, setJson] = useState("");
  const [plan, setPlan] = useState<IImportPlan | null>(null);
  const [busy, setBusy] = useState(false);
  // A new key empties the file input, so the same file can be chosen again after an import.
  const [inputKey, setInputKey] = useState(0);
  const latestRead = useRef(0);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const read = ++latestRead.current;
    setPlan(null);
    setJson("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > IMPORT_FILE_MAX_CHARS) {
      toast.error(m.import_error_size());
      return;
    }
    try {
      const text = await file.text();
      // A slower read of an earlier choice must not overwrite a later one.
      if (read === latestRead.current) setJson(text);
    } catch {
      toast.error(m.import_failed());
    }
  }

  async function preview() {
    setBusy(true);
    try {
      const result = await previewImportFile({ data: { json } });
      if (!result.ok) {
        toast.error(failureText(result.error, result.issues));
        setPlan(null);
        return;
      }
      setPlan(result.plan);
    } catch {
      toast.error(m.import_failed());
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    setBusy(true);
    try {
      const result = await runImportFile({ data: { json } });
      if (!result.ok) {
        toast.error(failureText(result.error, result.issues));
        return;
      }
      toast.success(
        m.import_done({
          created: result.result.created,
          skipped: result.result.skipped,
        }),
      );
      setPlan(null);
      setJson("");
      setInputKey((key) => key + 1);
      await queryClient.invalidateQueries({
        queryKey: UNPINNED_IMPORTS_QUERY_KEY,
      });
    } catch {
      toast.error(m.import_failed());
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer size="wide">
      <h1 className="text-2xl font-semibold">{m.import_title()}</h1>
      <p>{m.import_intro()}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="import-file">{m.import_file_label()}</Label>
        <Input
          key={inputKey}
          id="import-file"
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={(event) => void onFile(event)}
        />
        <div>
          <Button
            type="button"
            disabled={!json || busy}
            onClick={() => void preview()}
          >
            {m.import_preview_button()}
          </Button>
        </div>
      </div>
      {plan ? (
        <ImportPlanView
          // A new preview starts with the duplicate confirmation unticked.
          key={`${plan.total}-${plan.toCreate.length}-${plan.duplicates.length}`}
          plan={plan}
          busy={busy}
          onRun={() => void run()}
        />
      ) : null}
      <UnpinnedTable />
    </PageContainer>
  );
}
