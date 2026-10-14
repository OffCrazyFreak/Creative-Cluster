import { describe, expect, it } from "vitest";

import {
  countLinks,
  contactFieldsSchema,
  contactMessageSchema,
} from "./contact-schemas";

describe("contact message links", () => {
  it("counts urls and ignores email addresses", () => {
    expect(countLinks("see https://a.example and www.b.hr")).toBe(2);
    expect(countLinks("write to me@example.org")).toBe(0);
  });

  it("accepts one link and refuses two or more than 1,000 characters", () => {
    expect(contactMessageSchema.safeParse("hi https://a.example").success).toBe(
      true,
    );
    expect(
      contactMessageSchema.safeParse("https://a.example https://b.example")
        .success,
    ).toBe(false);
    expect(contactMessageSchema.safeParse("x".repeat(1001)).success).toBe(
      false,
    );
  });
});

describe("contact name", () => {
  const base = { email: "a@example.org", message: "hi" };

  it("collapses line breaks into one line", () => {
    const parsed = contactFieldsSchema.parse({ ...base, name: "Ann\n\nLee" });
    expect(parsed.name).toBe("Ann Lee");
  });

  it("refuses links in the name", () => {
    expect(
      contactFieldsSchema.safeParse({
        ...base,
        name: "Win at https://x.example",
      }).success,
    ).toBe(false);
  });
});
