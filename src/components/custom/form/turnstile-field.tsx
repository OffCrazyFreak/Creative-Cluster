import { Turnstile } from "@marsidev/react-turnstile";

import { getLocale } from "@/paraglide/runtime";

// Read from import.meta.env directly: env.client.ts is client-only and this form also renders on the server.
// The fallback is Cloudflare's always-pass test key.
const SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  "1x00000000000000000000AA";

interface ITurnstileFieldProps {
  onToken: (token: string) => void;
  onExpire: () => void;
}

export default function TurnstileField({
  onToken,
  onExpire,
}: ITurnstileFieldProps) {
  return (
    <Turnstile
      siteKey={SITE_KEY}
      options={{ language: getLocale(), appearance: "interaction-only" }}
      onSuccess={onToken}
      onExpire={onExpire}
    />
  );
}
