export interface IListGroup<T> {
  id: "on-map" | "elsewhere" | "all";
  // Null when the list is one plain group with no heading.
  heading: string | null;
  entries: T[];
}

interface IListGroupsInput<T> {
  onMap: T[];
  elsewhere: T[];
  labels: {
    onMap: (count: number) => string;
    elsewhere: (count: number) => string;
  };
}

// The list splits under headings only when the map shows some entries but not all.
export function listGroups<T>({
  onMap,
  elsewhere,
  labels,
}: IListGroupsInput<T>): IListGroup<T>[] {
  if (onMap.length > 0 && elsewhere.length > 0) {
    return [
      { id: "on-map", heading: labels.onMap(onMap.length), entries: onMap },
      {
        id: "elsewhere",
        heading: labels.elsewhere(elsewhere.length),
        entries: elsewhere,
      },
    ];
  }
  return [{ id: "all", heading: null, entries: [...onMap, ...elsewhere] }];
}
