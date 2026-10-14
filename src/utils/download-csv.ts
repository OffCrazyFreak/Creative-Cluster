// The byte order mark makes Excel read the file as UTF-8, which Croatian names need.
export function downloadCsv(csv: string, filenamePrefix: string) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  // Some browsers start the download after click returns; revoking at once can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
