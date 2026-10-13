import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicGuard } from "@/server/guards";
import { clientIp } from "@/server/request.server";

import {
  reverseInputSchema,
  searchInputSchema,
  suggestInputSchema,
} from "./location-schemas";
import {
  dguImportInfo,
  reversePoint,
  searchAddresses,
  suggestAddresses,
} from "./location.server";

export const suggestAddressFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(suggestInputSchema)
  .handler(({ data }) => suggestAddresses(clientIp(), data));

export const searchAddressFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(searchInputSchema)
  .handler(({ data }) => searchAddresses(clientIp(), data));

export const reverseGeocodeFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(reverseInputSchema)
  .handler(({ data }) => reversePoint(clientIp(), data.lat, data.lng));

export const dguAttributionFn = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(() => dguImportInfo());
