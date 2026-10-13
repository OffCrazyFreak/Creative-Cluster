import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "@/paraglide/server";

export default {
  fetch(request: Request): Promise<Response> {
    // The router rewrites localized URLs itself, so the original request goes on.
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
