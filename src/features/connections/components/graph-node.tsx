import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { GRAPH_NODE } from "../graph-layout";

// Edges run centre to centre, so both handles sit in the middle of the node and stay invisible.
const CENTER_HANDLE = {
  top: "50%",
  opacity: 0,
  pointerEvents: "none",
} as const;

export type GraphNodeData = Node<
  { label: string; slug: string | null; center: boolean },
  "partner"
>;

// Plain text on purpose: the list beside the diagram carries the links and the accessible reading.
export default function GraphNode({ data }: NodeProps<GraphNodeData>) {
  return (
    <div
      style={{ width: GRAPH_NODE.width, height: GRAPH_NODE.height }}
      className={`flex items-center justify-center border bg-card px-2 text-center text-xs text-card-foreground ${data.center ? "font-semibold" : ""} ${data.slug ? "cursor-pointer" : ""}`}
    >
      <Handle
        id="s"
        type="source"
        position={Position.Top}
        isConnectable={false}
        style={CENTER_HANDLE}
      />
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={CENTER_HANDLE}
      />
      <span className="line-clamp-2">{data.label}</span>
    </div>
  );
}
