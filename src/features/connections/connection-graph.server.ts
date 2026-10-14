import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client.server";
import { link } from "@/db/schema";

import type { IConnectionGraph, IPublicPartner } from "./connections-schemas";
import { GRAPH_NODE, layoutGraph, type IPoint } from "./graph-layout";

const CACHE_LIMIT = 200;
const layoutCache = new Map<string, Map<string, IPoint>>();

function cached(key: string, build: () => Map<string, IPoint>) {
  const hit = layoutCache.get(key);
  if (hit) return hit;
  const value = build();
  if (layoutCache.size >= CACHE_LIMIT)
    layoutCache.delete(layoutCache.keys().next().value as string);
  layoutCache.set(key, value);
  return value;
}

interface ISelf {
  id: string;
  name: string;
}

// Confirmed links among the shown partners make the picture a network instead of a star.
async function linksAmong(ids: string[]) {
  if (ids.length < 2) return [];
  return db
    .select({ id: link.id, fromId: link.fromId, toId: link.toId })
    .from(link)
    .where(
      and(
        eq(link.status, "confirmed"),
        inArray(link.fromId, ids),
        inArray(link.toId, ids),
      ),
    )
    .orderBy(link.id);
}

export async function buildGraph(
  self: ISelf,
  shown: IPublicPartner[],
  total: number,
): Promise<IConnectionGraph | null> {
  if (shown.length === 0) return null;
  const partnerIds = shown;
  const among = await linksAmong(partnerIds.map((p) => p.entryId));
  const edges = [
    ...partnerIds.map((p) => ({
      id: p.linkId,
      source: self.id,
      target: p.entryId,
    })),
    ...among.map((l) => ({ id: l.id, source: l.fromId, target: l.toId })),
  ];
  // The key is the confirmed link set itself, so any change to it recomputes the layout.
  const key = edges
    .map((e) => e.id)
    .sort()
    .join(",");
  const points = cached(`${self.id}:${key}`, () =>
    layoutGraph(
      key,
      self.id,
      partnerIds.map((p) => p.entryId),
      edges,
    ),
  );
  const nodes = [
    { id: self.id, label: self.name, slug: null },
    ...partnerIds.map((p) => ({ id: p.entryId, label: p.name, slug: p.slug })),
  ].map((node) => ({ ...node, ...(points.get(node.id) as IPoint) }));
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  return {
    nodes,
    edges: edges.map(({ id, source, target }) => ({ id, source, target })),
    width: Math.max(...xs) - Math.min(...xs) + GRAPH_NODE.width,
    height: Math.max(...ys) - Math.min(...ys) + GRAPH_NODE.height,
    more: Math.max(0, total - shown.length),
  };
}
