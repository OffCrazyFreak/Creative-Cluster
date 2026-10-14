import { createFileRoute } from "@tanstack/react-router";

import { getMapDirectory } from "@/features/directory/map-directory.server";

// A raw route on purpose: the payload is identical for everyone, so it must run no session lookup
// and can never carry a Set-Cookie header while being publicly cacheable.
// Browsers revalidate on every use (max-age=0, answered by a 304 through the ETag), so a suspended
// or archived entry leaves the map within the server cache window plus the short stale window.
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
