import { z } from "zod";

import {
  LOCATION_DISPLAYS,
  LOCATION_PRECISIONS,
  LOCATION_SOURCES,
} from "@/constants/entry";

const countryCode = z
  .string()
  .regex(/^[A-Za-z]{2}$/)
  .transform((code) => code.toUpperCase());

export const suggestInputSchema = z.object({
  text: z.string().trim().min(3).max(200),
  // Required: without a country the DGU table is skipped and Photon has no box to filter by.
  countryCode,
});
export const searchInputSchema = suggestInputSchema;

export const reverseInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// What forms store; each field maps to an entry column (source -> location_source, display -> location_display).
export const locationValueSchema = z
  .object({
    onlineOnly: z.boolean(),
    addressText: z.string().trim().max(300).nullable(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    city: z.string().trim().max(120).nullable(),
    countryCode: countryCode.nullable(),
    precision: z.enum(LOCATION_PRECISIONS).nullable(),
    source: z.enum(LOCATION_SOURCES).nullable(),
    pinMovedByHand: z.boolean(),
    display: z.enum(LOCATION_DISPLAYS),
    // Not stored: only sizes the privacy offset of a person's pin on the server.
    townPopulation: z.number().int().min(0).nullable().optional(),
  })
  .refine((value) => (value.lat === null) === (value.lng === null), {
    message: "lat and lng go together",
    path: ["lat"],
  });

export type LocationValue = z.infer<typeof locationValueSchema>;
export type SuggestInput = z.infer<typeof suggestInputSchema>;

export function emptyLocation(
  countryCode: string | null = null,
): LocationValue {
  return {
    onlineOnly: false,
    addressText: null,
    lat: null,
    lng: null,
    city: null,
    countryCode,
    precision: null,
    source: null,
    pinMovedByHand: false,
    display: "exact",
  };
}
