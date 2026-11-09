import { Turnstile } from "@marsidev/react-turnstile";

import { getLocale } from "@/paraglide/runtime";

// env.client.ts is client-only and this renders on the server too; the fallback is Cloudflare's test key.
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
