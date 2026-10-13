import { notFound, redirect } from "@tanstack/react-router";

import { getDirectoryList } from "./directory.functions";
import type { ListInput } from "./directory-schemas";

// Shared by the three list routes: maps the server result to the router's 404 and 301.
export async function loadDirectoryList(input: ListInput) {
  const result = await getDirectoryList({ data: input });
  if (result.status === "missing") throw notFound();
  if (result.status === "redirect")
    throw redirect({
      to: "/directory/tag/$tag",
      params: { tag: result.tagSlug },
      statusCode: 301,
    });
  return result;
}
