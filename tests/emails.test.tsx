import { readFileSync } from "node:fs";

import { beforeAll, describe, expect, it } from "vitest";

import { EMAIL_TEMPLATE_NAMES } from "@/constants/email";
import { LOCALES } from "@/constants/locales";
import type { EMAIL_TEMPLATES as Templates } from "@/emails/email-templates";
import type { renderEmail as RenderEmailFn } from "@/lib/email/render-email";

import { ensureParaglide } from "../scripts/ensure-paraglide";

let renderEmail: typeof RenderEmailFn;
let templates: typeof Templates;

beforeAll(async () => {
  await ensureParaglide();
  ({ renderEmail } = await import("@/lib/email/render-email"));
  ({ EMAIL_TEMPLATES: templates } = await import("@/emails/email-templates"));
});

// Paraglide returns the message key itself when a translation is missing.
const MISSING_MESSAGE = /\bemail_[a-z0-9_]+\b/;

describe("email templates", () => {
  for (const name of EMAIL_TEMPLATE_NAMES) {
    for (const locale of LOCALES) {
      it(`renders ${name} in ${locale} with every message present`, async () => {
        const props = { ...templates[name].previewProps, locale };
        const { html, text, subject } = await renderEmail(name, props);
        expect(subject.length).toBeGreaterThan(0);
        expect(`${subject}\n${html}\n${text}`).not.toMatch(MISSING_MESSAGE);
        expect(html).toContain(`lang="${locale}"`);
        if ("link" in props) expect(text).toContain(props.link);
      });
    }
  }
});

// Paraglide falls back to the base locale silently, so compare the files directly.
describe("message files", () => {
  for (const area of ["auth", "email", "admin", "moderation-email"]) {
    it(`${area} has the same keys in en and hr`, () => {
      function keys(locale: string) {
        const file = readFileSync(`messages/${area}/${locale}.json`, "utf8");
        return Object.keys(JSON.parse(file) as Record<string, unknown>).sort();
      }
      expect(keys("hr")).toEqual(keys("en"));
    });
  }
});
