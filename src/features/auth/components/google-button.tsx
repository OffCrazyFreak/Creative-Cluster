import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";
import { getLocale, localizeHref } from "@/paraglide/runtime";

import { safeRedirect } from "../safe-redirect";

interface IGoogleButtonProps {
  redirect?: string;
}

export default function GoogleButton({ redirect }: IGoogleButtonProps) {
  // better-auth sends the browser to these URLs, so they carry the language prefix already.
  const locale = getLocale();
  const target = safeRedirect(redirect) ?? "/account";
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() =>
        void authClient.signIn.social({
          provider: "google",
          callbackURL: localizeHref(target, { locale }),
          errorCallbackURL: localizeHref("/login?error=google", { locale }),
        })
      }
    >
      {m.auth_login_google()}
    </Button>
  );
}
