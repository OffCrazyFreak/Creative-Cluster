import { Position, type NodeHandle } from "@xyflow/react";

import { GRAPH_NODE } from "./graph-layout";

export const SOURCE_HANDLE_ID = "s";
export const TARGET_HANDLE_ID = "t";

// The server cannot measure handles, so they are declared up front; edges run centre to centre.
export const GRAPH_HANDLES: NodeHandle[] = [
  { id: SOURCE_HANDLE_ID, type: "source" },
  { id: TARGET_HANDLE_ID, type: "target" },
].map(({ id, type }) => ({
  id,
  type: type as "source" | "target",
  position: Position.Top,
  x: GRAPH_NODE.width / 2,
  y: GRAPH_NODE.height / 2,
  width: 1,
  height: 1,
}));
