import { Button, Link, Text } from "@react-email/components";

import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";

interface IActionButtonProps {
  href: string;
  label: string;
  locale: AppLocale;
}

// The raw link sits under the button because some mail clients block button styling.
export default function ActionButton({
  href,
  label,
  locale,
}: IActionButtonProps) {
  return (
    <>
      <Button
        href={href}
        style={{
          padding: "12px 20px",
          border: "1px solid currentColor",
          textDecoration: "underline",
        }}
      >
        {label}
      </Button>
      <Text>
        {m.email_link_fallback({}, { locale })}
        <br />
        <Link href={href}>{href}</Link>
      </Text>
    </>
  );
}
