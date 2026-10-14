import { laeaPosToLonLat } from "./project";
import {
  findAll,
  findFirst,
  zipEntryMembers,
  type IGmlNode,
} from "./gml-stream";
import type { IReferenceData } from "./reference-data";

export interface IDguAddress {
  street: string;
  settlement: string;
  postcode: string;
  postName: string;
  houseNumber: number;
  suffix: string;
  lon: number;
  lat: number;
}

function designators(address: IGmlNode): Map<string, string> {
  const found = new Map<string, string>();
  for (const item of findAll(address, "ad:LocatorDesignator")) {
    const type = findFirst(item, "ad:type")?.attrs["xlink:href"] ?? "";
    const value = item.children.find((child) => child.name === "ad:designator");
    found.set(type.split("/").at(-1) ?? "", value?.text.trim() ?? "");
  }
  return found;
}

// Returns undefined for rows that cannot be placed or have no usable house number.
export function toAddress(
  member: IGmlNode,
  reference: IReferenceData,
): IDguAddress | undefined {
  const address = member.children[0];
  const pos = findFirst(address, "gml:pos")?.text;
  const numbers = designators(address);
  const match = /^(\d+)\s*(.*)$/.exec(numbers.get("addressNumber") ?? "");
  if (!pos || !match) return undefined;

  const links = findAll(address, "ad:component").map((c) =>
    (c.attrs["xlink:href"] ?? "").replace(/^#/, ""),
  );
  const street = links
    .map((id) => reference.thoroughfares.get(id))
    .find(Boolean);
  const postal = links.map((id) => reference.postal.get(id)).find(Boolean);
  const settlement = links
    .map((id) => reference.settlements.get(id))
    .find(Boolean);
  if (!street) return undefined;

  const { lon, lat } = laeaPosToLonLat(pos);
  // One bad row must not abort a 2.6 GB import (int4 overflow, NaN stored in a real column).
  const houseNumber = Number(match[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || houseNumber > 99_999)
    return undefined;
  // "105A/1": the extension letter, then a slash and the second extension (a flat or entrance).
  const second = numbers.get("addressNumber2ndExtension");
  const suffix = `${match[2]}${numbers.get("addressNumberExtension") ?? ""}${second ? `/${second}` : ""}`;
  return {
    street,
    settlement: settlement ?? postal?.name ?? "",
    postcode: postal?.code ?? "",
    postName: postal?.name ?? "",
    houseNumber,
    suffix: suffix.replace(/\s+/g, "").toUpperCase(),
    lon,
    lat,
  };
}

export async function* readAddresses(
  zipPath: string,
  reference: IReferenceData,
) {
  for await (const member of zipEntryMembers(zipPath, "Address.gml")) {
    const address = toAddress(member, reference);
    if (address) yield address;
  }
}
