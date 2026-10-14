import { createMiddleware } from "@tanstack/react-start";
import {
  getResponseHeader,
  removeResponseHeader,
} from "@tanstack/react-start/server";

export const GONE_HEADER = "x-entry-gone";

// The router can only answer 200, 404 or 500, so a suspended entry's loader sets this marker
// header on the response and the route's middleware turns the rendered page into a 410.
export const goneStatusMiddleware = createMiddleware().server(
  async ({ next }) => {
    const result = await next();
    if (getResponseHeader(GONE_HEADER) !== "1") return result;
    removeResponseHeader(GONE_HEADER);
    return new Response(result.response.body, {
      status: 410,
      headers: result.response.headers,
    });
  },
);
