import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { IMAGE_FILE_PATTERN } from "@/constants/images";
import { findImageBytes, findImageMeta } from "@/features/images/images.server";

function notFound() {
  return new Response("Not found", { status: 404 });
}

// The file name is `<sha256>.<ext>`: the hash makes the URL immutable, the extension is cosmetic.
export const Route = createFileRoute("/img/$id/$file")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const hash = IMAGE_FILE_PATTERN.exec(params.file)?.[1];
        if (!hash || !z.uuid().safeParse(params.id).success) return notFound();

        const meta = await findImageMeta(params.id, hash);
        if (!meta) return notFound();

        const headers = {
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: `"${hash}"`,
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "cross-origin",
        };
        if (request.headers.get("if-none-match") === headers.ETag) {
          return new Response(null, { status: 304, headers });
        }
        const bytes = await findImageBytes(params.id, hash);
        if (!bytes) return notFound();
        return new Response(new Uint8Array(bytes), {
          headers: {
            ...headers,
            "Content-Type": meta.mime,
            "Content-Length": String(meta.size),
          },
        });
      },
    },
  },
});
