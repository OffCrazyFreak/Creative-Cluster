import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "@/paraglide/server";
import { withSecurityHeaders } from "@/server/security-headers";

export default {
  async fetch(request: Request): Promise<Response> {
    // The router rewrites localized URLs itself, so the original request goes on.
    const response = await paraglideMiddleware(request, () =>
      handler.fetch(request),
    );
    return withSecurityHeaders(response);
  },
};
