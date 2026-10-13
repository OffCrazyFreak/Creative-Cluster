import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";

export default function GoogleButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() =>
        void authClient.signIn.social({
          provider: "google",
          callbackURL: "/account",
          errorCallbackURL: "/login?error=google",
        })
      }
    >
      {m.auth_login_google()}
    </Button>
  );
}
