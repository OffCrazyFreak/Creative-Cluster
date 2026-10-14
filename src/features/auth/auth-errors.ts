import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";
import { m } from "@/paraglide/messages";

interface IAuthClientError {
  code?: string;
  status?: number;
}

// better-auth answers with English text and a stable code; the page shows its own localized copy.
export function authErrorMessage(error: IAuthClientError): string {
  if (error.status === 429) return m.auth_login_error_limit();
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return m.auth_login_error_invalid();
    case "BANNED_USER":
      return m.auth_login_error_banned();
    case "INVALID_TOKEN":
      return m.auth_reset_invalid_token();
    case "PASSWORD_COMPROMISED":
      return m.auth_password_pwned();
    case "PASSWORD_TOO_SHORT":
      return m.auth_password_too_short({ min: PASSWORD_MIN_LENGTH });
    case "PASSWORD_TOO_LONG":
      return m.auth_password_too_long({ max: PASSWORD_MAX_LENGTH });
    default:
      return m.auth_error_generic();
  }
}
