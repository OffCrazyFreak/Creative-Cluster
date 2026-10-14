import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

// Shared by the graph and its loading placeholder so the page does not jump when the chunk arrives.
export const GRAPH_BOX_CLASS = "h-96 md:h-[32rem]";
export const GRAPH_NODE = { width: 150, height: 44 } as const;
const TICKS = 300;
const LINK_DISTANCE = 190;

export interface IPoint {
  x: number;
  y: number;
}

interface ISimNode extends SimulationNodeDatum {
  id: string;
}

// Seeded so the same link set always produces the same picture on every server instance.
function seededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (const char of seed)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layoutGraph(
  seed: string,
  centerId: string,
  partnerIds: string[],
  edges: { source: string; target: string }[],
): Map<string, IPoint> {
  const nodes: ISimNode[] = [
    { id: centerId, x: 0, y: 0, fx: 0, fy: 0 },
    ...partnerIds.map((id) => ({ id })),
  ];
  const links: SimulationLinkDatum<ISimNode>[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));
  const radius = Math.hypot(GRAPH_NODE.width, GRAPH_NODE.height) / 2;
  const simulation = forceSimulation(nodes)
    .randomSource(seededRandom(seed))
    .force(
      "link",
      forceLink<ISimNode, SimulationLinkDatum<ISimNode>>(links)
        .id((node) => node.id)
        .distance(LINK_DISTANCE),
    )
    .force("charge", forceManyBody().strength(-500))
    .force("collide", forceCollide(radius))
    .stop();
  for (let tick = 0; tick < TICKS; tick += 1) simulation.tick();

  return new Map(
    nodes.map((node) => [
      node.id,
      {
        x: Math.round((node.x ?? 0) - GRAPH_NODE.width / 2),
        y: Math.round((node.y ?? 0) - GRAPH_NODE.height / 2),
      },
    ]),
  );
}
