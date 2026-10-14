import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  CHANGE_ACTIONS,
  CHANGE_SOURCES,
  MODERATED_ENTITIES,
} from "@/constants/moderation";
import ChangesPage from "@/features/changes/components/changes-page";
import { changesQueryOptions } from "@/features/changes/changes-queries";

const searchSchema = z.object({
  entityType: z.enum(MODERATED_ENTITIES).optional().catch(undefined),
  source: z.enum(CHANGE_SOURCES).optional().catch(undefined),
  action: z.enum(CHANGE_ACTIONS).optional().catch(undefined),
  entityId: z.uuid().optional().catch(undefined),
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/admin/changes")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(changesQueryOptions(deps)),
  component: ChangesRoute,
});

function ChangesRoute() {
  return <ChangesPage search={Route.useSearch()} />;
}
