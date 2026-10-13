import { useMemo } from "react";

import type { IMapDirectory } from "@/features/directory/directory-schemas";

// Filter options come from the published data itself, so an option always has results.
export function useMapFacets(directory: IMapDirectory | undefined) {
  return useMemo(() => {
    const tagCounts = new Map<number, number>();
    const countries = new Set<string>();
    const legal = new Set<string>();
    for (const entry of directory?.entries ?? []) {
      if (entry.country) countries.add(entry.country);
      if (entry.legal) legal.add(entry.legal);
      for (const i of entry.tags) tagCounts.set(i, (tagCounts.get(i) ?? 0) + 1);
    }
    const tags = [...tagCounts]
      .map(([i, count]) => ({
        ...(directory?.tags[i] as NonNullable<
          typeof directory
        >["tags"][number]),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.en.localeCompare(b.en));
    return {
      tags,
      countries: [...countries].sort(),
      legal: [...legal].sort(),
    };
  }, [directory]);
}
