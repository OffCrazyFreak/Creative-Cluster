import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";

import { publicGuard } from "@/server/guards";
import { clientIp } from "@/server/request.server";

import { GONE_HEADER } from "./gone-status-middleware";
import { slugInputSchema } from "./entry-schemas";
import { recordEntryView } from "./entry-view.server";
import { findEntryForPage } from "./public-entry.server";

export const getEntryPage = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(slugInputSchema)
  .handler(async ({ data, context }) => {
    const result = await findEntryForPage(
      data.slug,
      Boolean(context.session && !context.session.user.banned),
    );
    if (result.status === "gone") setResponseHeader(GONE_HEADER, "1");
    return result;
  });

export const trackEntryView = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(slugInputSchema)
  .handler(async ({ data, context }) => {
    await recordEntryView(data.slug, {
      userAgent: getRequestHeader("user-agent"),
      purpose: getRequestHeader("sec-purpose") ?? getRequestHeader("purpose"),
      ip: clientIp(),
      viewerId: context.session?.user.id ?? null,
    });
  });
