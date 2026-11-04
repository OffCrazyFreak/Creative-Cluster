import { createFileRoute } from "@tanstack/react-router";

import { getMapDirectory } from "@/features/directory/map-directory.server";

// Raw route so it runs no session lookup and sets no cookie; revalidation means a suspended entry leaves the map within the server cache plus the stale window.
export const Route = createFileRoute("/directory.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const directory = await getMapDirectory();
        const etag = `"${directory.hash}"`;
        const headers = {
          ETag: etag,
          "Cache-Control": "public, max-age=0, stale-while-revalidate=15",
        };
        if (request.headers.get("if-none-match") === etag)
          return new Response(null, { status: 304, headers });
        return Response.json(directory, { headers });
      },
    },
  },
});
