export interface IListGroup<T> {
  id: "saved" | "on-map" | "elsewhere" | "others" | "all";
  // Null when the list is one plain group with no heading.
  heading: string | null;
  entries: T[];
}

interface IListGroupsInput<T> {
  saved: T[];
  onMap: T[];
  elsewhere: T[];
  labels: {
    saved: (count: number) => string;
    onMap: (count: number) => string;
    elsewhere: (count: number) => string;
    others: (count: number) => string;
  };
}

// Saved entries lead in their own group. The rest split under headings only when the map shows
// some entries but not all, and otherwise share one heading once a Saved group sits above them.
export function listGroups<T>({
  saved,
  onMap,
  elsewhere,
  labels,
}: IListGroupsInput<T>): IListGroup<T>[] {
  const groups: IListGroup<T>[] =
    saved.length > 0
      ? [{ id: "saved", heading: labels.saved(saved.length), entries: saved }]
      : [];
  const rest = [...onMap, ...elsewhere];
  if (onMap.length > 0 && elsewhere.length > 0) {
    groups.push(
      { id: "on-map", heading: labels.onMap(onMap.length), entries: onMap },
      {
        id: "elsewhere",
        heading: labels.elsewhere(elsewhere.length),
        entries: elsewhere,
      },
    );
  } else if (saved.length > 0 && rest.length > 0) {
    groups.push({
      id: "others",
      heading: labels.others(rest.length),
      entries: rest,
    });
  } else if (saved.length === 0) {
    groups.push({ id: "all", heading: null, entries: rest });
  }
  return groups;
}
