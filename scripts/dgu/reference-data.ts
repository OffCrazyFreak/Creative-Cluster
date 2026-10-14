import {
  findAll,
  findFirst,
  zipEntryMembers,
  type IGmlNode,
} from "./gml-stream";

export interface IReferenceData {
  thoroughfares: Map<string, string>;
  postal: Map<string, { name: string; code: string }>;
  settlements: Map<string, string>;
}

function gmlId(node: IGmlNode): string {
  return node.attrs["gml:id"] ?? "";
}

function spelling(node: IGmlNode): string {
  return findFirst(node, "gn:text")?.text.trim() ?? "";
}

// Only fourth-order units are settlements; the other unit on an address is its municipality.
export async function readReferenceData(
  zipPath: string,
): Promise<IReferenceData> {
  const data: IReferenceData = {
    thoroughfares: new Map(),
    postal: new Map(),
    settlements: new Map(),
  };
  for await (const member of zipEntryMembers(zipPath, "ThoroughfareName.gml")) {
    const node = member.children[0];
    data.thoroughfares.set(gmlId(node), spelling(node));
  }
  for await (const member of zipEntryMembers(zipPath, "PostalDescriptor.gml")) {
    const node = member.children[0];
    const code = findFirst(node, "ad:postCode")?.text.trim() ?? "";
    data.postal.set(gmlId(node), { name: spelling(node), code });
  }
  for await (const member of zipEntryMembers(zipPath, "AdminUnitName.gml")) {
    const node = member.children[0];
    const level = findAll(node, "ad:level")[0]?.attrs["xlink:href"] ?? "";
    if (level.endsWith("/4thOrder"))
      data.settlements.set(gmlId(node), spelling(node));
  }
  return data;
}
