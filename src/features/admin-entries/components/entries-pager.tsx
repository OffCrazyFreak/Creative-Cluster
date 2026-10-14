import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface IEntriesPagerProps {
  page: number;
  pages: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  label?: string;
}

export default function EntriesPager({
  page,
  pages,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  label = m.admin_entries_pagination(),
}: IEntriesPagerProps) {
  return (
    <nav className="flex items-center gap-4" aria-label={label}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="max-sm:min-h-11"
        disabled={!canPrevious}
        onClick={onPrevious}
      >
        {m.admin_entries_prev()}
      </Button>
      <span aria-live="polite">{m.admin_entries_page({ page, pages })}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="max-sm:min-h-11"
        disabled={!canNext}
        onClick={onNext}
      >
        {m.admin_entries_next()}
      </Button>
    </nav>
  );
}
