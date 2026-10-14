import { m } from "@/paraglide/messages";

import type { IImportDuplicate, IImportWarning } from "./import-plan.server";

export function warningText(item: IImportWarning): string {
  switch (item.code) {
    case "no_email":
      return m.import_warning_no_email();
    case "bad_email":
      return m.import_warning_bad_email();
    case "no_pin":
      return m.import_warning_no_pin();
    case "town_pin":
      return m.import_warning_town_pin();
    case "no_website":
      return m.import_warning_no_website();
    case "unknown_tag":
      return m.import_warning_unknown_tag({ tag: item.detail ?? "" });
  }
}

export function duplicateText(item: IImportDuplicate): string {
  const other = item.other ?? "";
  switch (item.reason) {
    case "existing_name":
      return m.import_duplicate_existing_name({ other });
    case "existing_website":
      return m.import_duplicate_existing_website({ other });
    case "file_name":
      return m.import_duplicate_file_name();
    case "file_website":
      return m.import_duplicate_file_website();
  }
}
