import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicGuard } from "@/server/guards";

import { listInputSchema } from "./directory-schemas";
import {
  listDirectoryFacets,
  listPublicEntries,
} from "./directory-list.server";
import { getMapDirectory } from "./map-directory.server";

export const getPublishedDirectory = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(() => getMapDirectory());

export const getDirectoryList = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(listInputSchema)
  .handler(({ data }) => listPublicEntries(data));

export const getDirectoryFacets = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(() => listDirectoryFacets());
