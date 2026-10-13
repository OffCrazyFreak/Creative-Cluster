import { Turnstile } from "@marsidev/react-turnstile";

import { clientEnv } from "@/env.client";
import { getLocale } from "@/paraglide/runtime";

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
      siteKey={clientEnv.VITE_TURNSTILE_SITE_KEY}
      options={{ language: getLocale(), appearance: "interaction-only" }}
      onSuccess={onToken}
      onExpire={onExpire}
    />
  );
}
