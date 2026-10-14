import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { NONCE_HEADER } from "./nonce-header";

// The server entry sets this header per request. On the client, TanStack Router reads the nonce back from the csp-nonce meta tag it renders into the page head.
export const getRequestNonce = createServerOnlyFn(
  (): string | undefined => getRequestHeader(NONCE_HEADER) ?? undefined,
);
