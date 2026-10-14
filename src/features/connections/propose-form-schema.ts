import { z } from "zod";

import { LINK_KINDS } from "@/constants/links";
import { m } from "@/paraglide/messages";
import { isHttpUrl, normalizeHttpUrl } from "@/utils/http-url";

import { LINK_DIRECTIONS, type ProposeLinkInput } from "./connections-schemas";

const YEAR = /^\d{4}$/;

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
  return isHttpUrl(normalizeHttpUrl(value));
}

// Mirrors what the server enforces so errors show beside the field before anything is sent.
export const proposeFormSchema = z
  .object({
    fromEntryId: z.string().min(1),
    outside: z.boolean(),
    targetId: z.string(),
    targetName: z.string(),
    outsideName: z.string().trim().max(120),
    outsideWebsite: z.string().trim(),
    kind: z.enum(LINK_KINDS),
    direction: z.enum(LINK_DIRECTIONS),
    year: z.string().trim(),
    endYear: z.string().trim(),
    project: z.string().trim().max(120),
    note: z.string().trim().max(500),
    evidenceUrl: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    function fail(path: string, message: string) {
      ctx.addIssue({ code: "custom", path: [path], message });
    }
    if (v.outside) {
      if (v.outsideName.length < 2)
        fail("outsideName", m.connections_err_required());
      if (!urlOk(v.outsideWebsite))
        fail("outsideWebsite", m.connections_err_url());
      if (!urlOk(v.evidenceUrl)) fail("evidenceUrl", m.connections_err_url());
    } else {
      if (!v.targetId) fail("targetId", m.connections_err_required());
      if (v.evidenceUrl && !urlOk(v.evidenceUrl))
        fail("evidenceUrl", m.connections_err_url());
    }
    if (v.year && !YEAR.test(v.year)) fail("year", m.connections_err_year());
    if (v.endYear && !YEAR.test(v.endYear))
      fail("endYear", m.connections_err_year());
    if (v.year && v.endYear && v.endYear < v.year)
      fail("endYear", m.connections_err_end_year());
  });

export function toProposeInput(v: IProposeFormValues): ProposeLinkInput {
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
