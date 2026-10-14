import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages";

import type { IImportPlan } from "../import-plan-codes";
import { duplicateText, warningText } from "../import-plan-text";

interface IImportPlanViewProps {
  plan: IImportPlan;
  busy: boolean;
  onRun: () => void;
}

export default function ImportPlanView({
  plan,
  busy,
  onRun,
}: IImportPlanViewProps) {
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  // A skipped organization is never revisited, so a missing tag must be fixed before importing.
  const missingTags = plan.warnings.some((item) => item.code === "unknown_tag");
  const needsConfirm = plan.duplicates.length > 0 && !allowDuplicates;
  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      <h2 className="text-lg font-semibold">{m.import_plan_title()}</h2>
      <p>
        {m.import_plan_summary({
          total: plan.total,
          created: plan.toCreate.length,
          existing: plan.alreadyImported.length,
        })}
      </p>
      {plan.duplicates.length > 0 ? (
        <Alert>
          <AlertTitle>{m.import_duplicates_title()}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {plan.duplicates.map((item) => (
                <li key={item.legacyId}>
                  {item.name}: {duplicateText(item)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {plan.warnings.length > 0 ? (
        <Alert>
          <AlertTitle>{m.import_warnings_title()}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {plan.warnings.map((item) => (
                <li key={`${item.legacyId}-${item.code}-${item.detail ?? ""}`}>
                  {item.name}: {warningText(item)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {plan.duplicates.length > 0 ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id="import-allow-duplicates"
            checked={allowDuplicates}
            onCheckedChange={(checked) => setAllowDuplicates(checked === true)}
          />
          <Label htmlFor="import-allow-duplicates">
            {m.import_duplicates_confirm()}
          </Label>
        </div>
      ) : null}
      {missingTags ? <p role="alert">{m.import_blocked_tags()}</p> : null}
      <div>
        <Button
          type="button"
          disabled={
            busy || plan.toCreate.length === 0 || needsConfirm || missingTags
          }
          onClick={onRun}
        >
          {plan.toCreate.length === 0
            ? m.import_nothing_new()
            : m.import_run_button({ count: plan.toCreate.length })}
        </Button>
      </div>
    </section>
  );
}
