import { describe, expect, it } from "vitest";

import { toAddress } from "../../scripts/dgu/addresses";
import { findFirst, gmlMembers } from "../../scripts/dgu/gml-stream";
import { streetRow } from "../../scripts/dgu/load";
import type { IReferenceData } from "../../scripts/dgu/reference-data";

const ADDRESS = `<wfs:FeatureCollection xmlns:wfs="w" xmlns:ad="a" xmlns:gml="g" xmlns:xlink="x">
<wfs:member><ad:Address gml:id="Address.1"><ad:position><ad:GeographicPosition><ad:geometry>
<gml:Point><gml:pos>2561799.19395499 4781765.61686003</gml:pos></gml:Point></ad:geometry></ad:GeographicPosition></ad:position>
<ad:locator><ad:AddressLocator>
<ad:designator><ad:LocatorDesignator><ad:designator>45</ad:designator><ad:type xlink:href="http://x/LocatorDesignatorTypeValue/addressNumber"/></ad:LocatorDesignator></ad:designator>
<ad:designator><ad:LocatorDesignator><ad:designator>a</ad:designator><ad:type xlink:href="http://x/LocatorDesignatorTypeValue/addressNumberExtension"/></ad:LocatorDesignator></ad:designator>
</ad:AddressLocator></ad:locator>
<ad:component xlink:href="#ThoroughfareName.9"/><ad:component xlink:href="#PostalDescriptor.8"/>
<ad:component xlink:href="#AdminUnitName.7"/></ad:Address></wfs:member></wfs:FeatureCollection>`;

const reference: IReferenceData = {
  thoroughfares: new Map([["ThoroughfareName.9", "Brežna ulica"]]),
  postal: new Map([
    ["PostalDescriptor.8", { name: "Oroslavje", code: "49243" }],
  ]),
  settlements: new Map([["AdminUnitName.7", "Andraševec"]]),
};

function* chunked(text: string, size: number) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

async function members(text: string, size: number) {
  const found = [];
  for await (const member of gmlMembers(chunked(text, size)))
    found.push(member);
  return found;
}

describe("DGU GML parsing", () => {
  it("yields members even when chunks split tags", async () => {
    const found = await members(ADDRESS, 7);
    expect(found).toHaveLength(1);
    expect(findFirst(found[0], "gml:pos")?.text).toContain("2561799");
  });

  it("normalises one address", async () => {
    const [member] = await members(ADDRESS, 1000);
    const address = toAddress(member, reference)!;
    expect(address).toMatchObject({
      street: "Brežna ulica",
      settlement: "Andraševec",
      postcode: "49243",
      houseNumber: 45,
      suffix: "A",
    });
    expect(address.lon).toBeCloseTo(15.9483, 3);
  });

  it("joins the second extension to the suffix with a slash", async () => {
    const second = ADDRESS.replace(
      "</ad:AddressLocator>",
      '<ad:designator><ad:LocatorDesignator><ad:designator>7</ad:designator><ad:type xlink:href="http://x/LocatorDesignatorTypeValue/addressNumber2ndExtension"/></ad:LocatorDesignator></ad:designator></ad:AddressLocator>',
    );
    const [member] = await members(second, 1000);
    expect(toAddress(member, reference)?.suffix).toBe("A/7");
  });

  it("drops rows without a usable number or street", async () => {
    const noNumber = ADDRESS.replace(">45<", ">bb<");
    const [member] = await members(noNumber, 1000);
    expect(toAddress(member, reference)).toBeUndefined();
  });

  it("builds a diacritics-free search text with the post town", async () => {
    const [member] = await members(ADDRESS, 1000);
    const row = streetRow(1, toAddress(member, reference)!);
    expect(row.searchText).toBe("brezna ulica andrasevec oroslavje 49243");
  });
});

describe("truncated input", () => {
  it("fails instead of ending quietly", async () => {
    const cut = ADDRESS.slice(0, ADDRESS.indexOf("</ad:Address>"));
    await expect(members(cut, 1000)).rejects.toThrow();
  });
});
