import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { IImportPlan } from "../import-plan.server";
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
      <div>
        <Button
          type="button"
          disabled={busy || plan.toCreate.length === 0}
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
