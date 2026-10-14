import { m } from "@/paraglide/messages";

interface IRelationYears {
  year: number | null;
  endYear: number | null;
  project: string | null;
}

// "Since 2020 · Project name": shared by the account page and the public page.
export function relationDetails({
  year,
  endYear,
  project,
}: IRelationYears): string {
  const years =
    year === null
      ? null
      : endYear === null
        ? m.connections_years_since({ start: year })
        : m.connections_years_range({ start: year, end: endYear });
  return [years, project].filter(Boolean).join(" · ");
}
