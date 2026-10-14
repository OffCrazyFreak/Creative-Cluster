import { useMutation, useQueryClient } from "@tanstack/react-query";

import { TAG_FIELDS } from "@/constants/tags";
import { saveTagsOfEntry } from "@/features/tags/tags.functions";

import { saveMyListing } from "../account.functions";
import { accountKeys } from "../account-queries";
import type { ListingFormValues } from "../listing-schemas";
import type { IOwnListing, SaveListingResult } from "../listing-types";

export class TagsNotSavedError extends Error {
  constructor() {
    super("Tags not saved");
    this.name = "TagsNotSavedError";
  }
}

function sameIds(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

// Tags have their own service (and change log row), so they are saved after the entry itself.
export function useSaveListing(listing: IOwnListing) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: ListingFormValues,
    ): Promise<SaveListingResult> => {
      const result = await saveMyListing({
        data: { entryId: listing.id, values },
      });
      if (result.status !== "saved") return result;
      let tagsSaved = false;
      try {
        for (const field of TAG_FIELDS) {
          if (sameIds(values.tags[field], listing.values.tags[field])) continue;
          await saveTagsOfEntry({
            data: { entryId: listing.id, field, tagIds: values.tags[field] },
          });
          tagsSaved = true;
        }
      } catch {
        throw new TagsNotSavedError();
      }
      return tagsSaved ? { ...result, changed: true } : result;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
