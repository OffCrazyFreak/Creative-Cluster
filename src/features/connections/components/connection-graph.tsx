import { ReactFlow, type Edge } from "@xyflow/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import { m } from "@/paraglide/messages";

import type { IConnectionGraph } from "../connections-schemas";
import {
  GRAPH_HANDLES,
  SOURCE_HANDLE_ID,
  TARGET_HANDLE_ID,
} from "../graph-handles";
import { GRAPH_BOX_CLASS, GRAPH_NODE } from "../graph-layout";
import GraphNode, { type GraphNodeData } from "./graph-node";

const NODE_TYPES = { partner: GraphNode };
const FIT_OPTIONS = { padding: 0.1 };

interface IConnectionGraphProps {
  graph: IConnectionGraph;
  centerId: string;
}

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
        handles: GRAPH_HANDLES,
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
        sourceHandle: SOURCE_HANDLE_ID,
        targetHandle: TARGET_HANDLE_ID,
        type: "straight",
      })),
    [graph.edges],
  );

  return (
    <div
      role="img"
      aria-label={m.connections_graph_label()}
      className={GRAPH_BOX_CLASS}
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
