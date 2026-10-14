import { useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import PageContainer from "@/components/custom/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages";

import { IMPORT_FILE_MAX_CHARS } from "../import-admin-schemas";
import type { ImportFileError } from "../import-admin.server";
import type { IImportPlan } from "../import-plan.server";
import { previewImportFile, runImportFile } from "../import.functions";
import { UNPINNED_IMPORTS_QUERY_KEY } from "../import-queries";
import ImportPlanView from "./import-plan-view";
import UnpinnedTable from "./unpinned-table";

function errorText(error: ImportFileError): string {
  if (error === "invalid_json") return m.import_error_json();
  if (error === "wrong_site") return m.import_error_site();
  return m.import_error_file();
}

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [json, setJson] = useState("");
  const [plan, setPlan] = useState<IImportPlan | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    setPlan(null);
    setJson("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > IMPORT_FILE_MAX_CHARS) {
      toast.error(m.import_error_size());
      return;
    }
    setJson(await file.text());
  }

  async function preview() {
    setBusy(true);
    try {
      const result = await previewImportFile({ data: { json } });
      if (!result.ok) {
        toast.error(`${errorText(result.error)} ${result.issues.join(", ")}`);
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
        toast.error(errorText(result.error));
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
          id="import-file"
          type="file"
          accept="application/json,.json"
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
        <ImportPlanView plan={plan} busy={busy} onRun={() => void run()} />
      ) : null}
      <UnpinnedTable />
    </PageContainer>
  );
}
