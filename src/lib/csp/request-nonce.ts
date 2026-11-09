import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { NONCE_HEADER } from "./nonce-header";

// The server entry sets this header per request; on the client, the router reads the csp-nonce meta tag.
export const getRequestNonce = createServerOnlyFn(
  (): string | undefined => getRequestHeader(NONCE_HEADER) ?? undefined,
);
