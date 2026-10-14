import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { m } from "@/paraglide/messages";

import { findSimilarEntriesFn } from "../apply.functions";

interface IDuplicateHintProps {
  name: string;
}

export default function DuplicateHint({ name }: IDuplicateHintProps) {
  const typed = useDebouncedValue(name.trim(), 400);
  const enabled = typed.length >= 3;
  const { data } = useQuery({
    queryKey: ["apply", "similar", typed],
    queryFn: () => findSimilarEntriesFn({ data: { name: typed } }),
    enabled,
    staleTime: 60_000,
  });

  if (!enabled || !data || data.length === 0) return null;
  return (
    <Alert role="status">
      <AlertTitle>{m.apply_duplicate_title()}</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-2">
          {data.map((item) => {
            const place = item.city ? ` (${item.city})` : "";
            return (
              <li key={item.slug}>
                <Link to="/e/$slug" params={{ slug: item.slug }}>
                  {item.name}
                </Link>{" "}
                {item.claimable
                  ? m.apply_duplicate_unclaimed({ place })
                  : m.apply_duplicate_owned({ place })}
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
