import { z } from "zod";

import type { IImageRef } from "@/typings/images";

export const DIRECTORY_PAGE_SIZE = 24;

export const listInputSchema = z.object({
  tag: z.string().min(1).max(80).optional(),
  country: z
    .string()
    .regex(/^[a-zA-Z]{2}$/)
    .optional(),
  page: z.number().int().min(1).max(1000).default(1),
});
export type ListInput = z.infer<typeof listInputSchema>;

// Slim row of the published directory that the map and the browser-side filters use.
export interface IDirectoryEntry {
  slug: string;
  name: string;
  kind: "organization" | "person";
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
  legal: string | null;
  logo: IImageRef | null;
  blurb: string;
  tags: number[];
  // Live opportunities of this entry; above zero the map pin gets a badge.
  opps: number;
}

export interface IDirectoryTag {
  slug: string;
  en: string;
  hr: string;
}

export interface IMapDirectory {
  hash: string;
  tags: IDirectoryTag[];
  entries: IDirectoryEntry[];
}

export interface IListItem {
  slug: string;
  name: string;
  kind: "organization" | "person";
  city: string | null;
  country: string | null;
  logo: IImageRef | null;
  blurb: string;
  tags: { slug: string; labelEn: string; labelHr: string }[];
}

export interface IListFacet {
  key: string;
  count: number;
}

export interface IDirectoryFacets {
  countries: IListFacet[];
  tags: { slug: string; labelEn: string; labelHr: string; count: number }[];
}

export type DirectoryListResult =
  | {
      status: "ok";
      items: IListItem[];
      total: number;
      page: number;
      pageCount: number;
      tag: { slug: string; labelEn: string; labelHr: string } | null;
    }
  | { status: "redirect"; tagSlug: string }
  | { status: "missing" };
