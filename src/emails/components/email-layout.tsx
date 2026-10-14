import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

type FooterKind = "account" | "requested" | "none";

interface IEmailLayoutProps {
  locale: AppLocale;
  preview: string;
  footer: FooterKind;
  children: ReactNode;
}

// Plain styling on purpose: brand colours arrive with the theme.
export default function EmailLayout({
  locale,
  preview,
  footer,
  children,
}: IEmailLayoutProps) {
  const footerValues = {
    siteName: site.name,
    siteUrl: site.origin,
    contactEmail: site.contactEmail,
    controllerName: site.legal.name,
  };
  const footerText =
    footer === "account"
      ? m.email_footer_account(footerValues, { locale })
      : m.email_footer_requested(footerValues, { locale });

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: "sans-serif", lineHeight: 1.5 }}>
        <Container style={{ maxWidth: 560, padding: 16 }}>
          <Text style={{ fontWeight: "bold", fontSize: 18 }}>{site.name}</Text>
          <Section>{children}</Section>
          {footer !== "none" && (
            <>
              <Hr />
              <Text style={{ fontSize: 12 }}>{footerText}</Text>
            </>
          )}
          <Text style={{ fontSize: 12 }}>
            <Link href={site.origin}>{site.origin}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
