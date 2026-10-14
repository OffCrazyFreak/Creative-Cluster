import "@xyflow/react/dist/style.css";

import { Position, ReactFlow, type Edge, type NodeHandle } from "@xyflow/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import { m } from "@/paraglide/messages";

import type { IConnectionGraph } from "../connections-schemas";
import { GRAPH_NODE } from "../graph-layout";
import GraphNode, { type GraphNodeData } from "./graph-node";

// Declared up front because the server cannot measure handles; edges need them to be drawn.
const HANDLES: NodeHandle[] = (["source", "target"] as const).map((type) => ({
  id: type === "source" ? "s" : "t",
  type,
  position: Position.Top,
  x: GRAPH_NODE.width / 2,
  y: GRAPH_NODE.height / 2,
  width: 1,
  height: 1,
}));

const NODE_TYPES = { partner: GraphNode };
const FIT_OPTIONS = { padding: 0.1 };

interface IConnectionGraphProps {
  graph: IConnectionGraph;
  centerId: string;
}

// Viewer only. Explicit node sizes and the precomputed layout let it render on the server.
export default function ConnectionGraph({
  graph,
  centerId,
}: IConnectionGraphProps) {
  const navigate = useNavigate();
  const nodes = useMemo(
    () =>
      graph.nodes.map((node): GraphNodeData => ({
        id: node.id,
        type: "partner",
        position: { x: node.x, y: node.y },
        width: GRAPH_NODE.width,
        height: GRAPH_NODE.height,
        handles: HANDLES,
        data: {
          label: node.label,
          slug: node.slug,
          center: node.id === centerId,
        },
      })),
    [graph.nodes, centerId],
  );
  const edges = useMemo(
    () =>
      graph.edges.map((edge): Edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: "s",
        targetHandle: "t",
        type: "straight",
      })),
    [graph.edges],
  );

  return (
    <div
      role="img"
      aria-label={m.connections_graph_label()}
      className="h-96 md:h-[32rem]"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        width={Math.max(graph.width, 320)}
        height={512}
        fitView
        fitViewOptions={FIT_OPTIONS}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        onNodeClick={(_, node) => {
          const slug = node.data.slug;
          if (slug) void navigate({ to: "/e/$slug", params: { slug } });
        }}
      />
    </div>
  );
}
