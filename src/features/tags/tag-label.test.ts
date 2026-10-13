import { describe, expect, it } from "vitest";

import { foldText, tagLabel, tagMatchesQuery } from "./tag-label";

const tag = {
  labelEn: "Product design",
  labelHr: "Dizajn proizvoda",
  aliasesEn: ["industrial design"],
  aliasesHr: ["industrijski dizajn", "oblikovanje"],
};

describe("tag labels", () => {
  it("picks the label for the locale", () => {
    expect(tagLabel(tag, "en")).toBe("Product design");
    expect(tagLabel(tag, "hr")).toBe("Dizajn proizvoda");
  });

  it("folds Croatian letters so č, ć, š, ž and đ match their plain forms", () => {
    expect(foldText("Đurđica Čačić šuma žaba")).toBe(
      "djurdjica cacic suma zaba",
    );
  });

  it("searches label and aliases in the current locale only", () => {
    expect(tagMatchesQuery(tag, "industrial", "en")).toBe(true);
    expect(tagMatchesQuery(tag, "industrial", "hr")).toBe(false);
    expect(tagMatchesQuery(tag, "oblik", "hr")).toBe(true);
    expect(tagMatchesQuery(tag, "proizvoda", "hr")).toBe(true);
    expect(tagMatchesQuery(tag, "", "en")).toBe(true);
  });
});
