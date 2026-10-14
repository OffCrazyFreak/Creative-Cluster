import { z } from "zod";

import { LINK_KINDS } from "@/constants/links";
import { m } from "@/paraglide/messages";
import { isHttpUrl, normalizeHttpUrl } from "@/utils/http-url";

import {
  LINK_DIRECTIONS,
  LINK_URL_MAX_LENGTH,
  LINK_YEAR_RANGE,
  type ProposeLinkInput,
} from "./connections-schemas";

const YEAR = /^\d{4}$/;
const NAME_MAX = 120;
const PROJECT_MAX = 120;
const NOTE_MAX = 500;

function trimmed(values: IProposeFormValues): IProposeFormValues {
  return {
    ...values,
    outsideName: values.outsideName.trim(),
    outsideWebsite: values.outsideWebsite.trim(),
    year: values.year.trim(),
    endYear: values.endYear.trim(),
    project: values.project.trim(),
    note: values.note.trim(),
    evidenceUrl: values.evidenceUrl.trim(),
  };
}

export interface IProposeFormValues {
  fromEntryId: string;
  outside: boolean;
  targetId: string;
  targetName: string;
  outsideName: string;
  outsideWebsite: string;
  kind: (typeof LINK_KINDS)[number];
  direction: (typeof LINK_DIRECTIONS)[number];
  year: string;
  endYear: string;
  project: string;
  note: string;
  evidenceUrl: string;
}

export function emptyProposeValues(fromEntryId: string): IProposeFormValues {
  return {
    fromEntryId,
    outside: false,
    targetId: "",
    targetName: "",
    outsideName: "",
    outsideWebsite: "",
    kind: "collaborated",
    direction: "outgoing",
    year: "",
    endYear: "",
    project: "",
    note: "",
    evidenceUrl: "",
  };
}

function urlOk(value: string) {
  const url = normalizeHttpUrl(value);
  return isHttpUrl(url) && value.trim().length <= LINK_URL_MAX_LENGTH;
}

function yearOk(value: string) {
  const year = Number(value);
  return (
    YEAR.test(value) &&
    year >= LINK_YEAR_RANGE.min &&
    year <= LINK_YEAR_RANGE.max
  );
}

// Mirrors what the server enforces so errors show beside the field before anything is sent.
// Length limits live in superRefine because a failed base parse would hide every other error.
export const proposeFormSchema = z
  .object({
    fromEntryId: z.string().min(1),
    outside: z.boolean(),
    targetId: z.string(),
    targetName: z.string(),
    outsideName: z.string(),
    outsideWebsite: z.string(),
    kind: z.enum(LINK_KINDS),
    direction: z.enum(LINK_DIRECTIONS),
    year: z.string(),
    endYear: z.string(),
    project: z.string(),
    note: z.string(),
    evidenceUrl: z.string(),
  })
  .superRefine((raw, ctx) => {
    const v = trimmed(raw);
    function fail(path: string, message: string) {
      ctx.addIssue({ code: "custom", path: [path], message });
    }
    function tooLong(path: string, max: number) {
      fail(path, m.connections_err_too_long({ max }));
    }
    if (v.outside) {
      if (v.outsideName.length < 2)
        fail("outsideName", m.connections_err_required());
      if (v.outsideName.length > NAME_MAX) tooLong("outsideName", NAME_MAX);
      if (!urlOk(v.outsideWebsite))
        fail("outsideWebsite", m.connections_err_url());
      if (!urlOk(v.evidenceUrl)) fail("evidenceUrl", m.connections_err_url());
    } else {
      if (!v.targetId) fail("targetId", m.connections_err_required());
      if (v.evidenceUrl && !urlOk(v.evidenceUrl))
        fail("evidenceUrl", m.connections_err_url());
    }
    if (v.year && !yearOk(v.year)) fail("year", m.connections_err_year());
    if (v.endYear && !yearOk(v.endYear))
      fail("endYear", m.connections_err_year());
    else if (v.endYear && !v.year)
      fail("endYear", m.connections_err_end_year());
    else if (v.endYear && v.year && v.endYear < v.year)
      fail("endYear", m.connections_err_end_year());
    if (v.project.length > PROJECT_MAX) tooLong("project", PROJECT_MAX);
    if (v.note.length > NOTE_MAX) tooLong("note", NOTE_MAX);
  });

// onSubmit receives the raw field values, not the schema output, so trimming happens here too.
export function toProposeInput(raw: IProposeFormValues): ProposeLinkInput {
  const v = trimmed(raw);
  return {
    fromEntryId: v.fromEntryId,
    target: v.outside
      ? { type: "outside", name: v.outsideName, website: v.outsideWebsite }
      : { type: "entry", entryId: v.targetId },
    kind: v.kind,
    direction: v.direction,
    year: v.year ? Number(v.year) : null,
    endYear: v.endYear ? Number(v.endYear) : null,
    project: v.project || null,
    note: v.note || null,
    evidenceUrl: v.evidenceUrl || null,
  };
}
