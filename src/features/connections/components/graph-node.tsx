import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { SOURCE_HANDLE_ID, TARGET_HANDLE_ID } from "../graph-handles";
import { GRAPH_NODE } from "../graph-layout";

const CENTER_HANDLE = {
  top: "50%",
  opacity: 0,
  pointerEvents: "none",
} as const;

export type GraphNodeData = Node<
  { label: string; slug: string | null; center: boolean },
  "partner"
>;

export default function GraphNode({ data }: NodeProps<GraphNodeData>) {
  return (
    <div
      style={{ width: GRAPH_NODE.width, height: GRAPH_NODE.height }}
      className={`flex items-center justify-center border bg-card px-2 text-center text-xs text-card-foreground ${data.center ? "font-semibold" : ""} ${data.slug ? "cursor-pointer" : ""}`}
    >
      <Handle
        id={SOURCE_HANDLE_ID}
        type="source"
        position={Position.Top}
        isConnectable={false}
        style={CENTER_HANDLE}
      />
      <Handle
        id={TARGET_HANDLE_ID}
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={CENTER_HANDLE}
      />
      <span className="line-clamp-2">{data.label}</span>
    </div>
  );
}
