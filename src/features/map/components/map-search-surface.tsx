import type { IFrameBox } from "../hooks/use-frame-box";

const FULL_CLIP = "inset(0px 0px calc(0% - 0px) 0px round 0px)";

// Cut down to the bar's own box rather than resized, so nothing inside scales or reflows.
function frameClip(frame: IFrameBox | null) {
  if (!frame) return FULL_CLIP;
  return `inset(${frame.top}px ${frame.right}px calc(100% - ${frame.bottom}px) ${frame.left}px round 16px)`;
}

interface IMapSearchSurfaceProps {
  open: boolean;
  frame: IFrameBox | null;
  transition: string;
}

// The open search's background, growing from the bar to the whole screen; invisible while shut.
export default function MapSearchSurface({
  open,
  frame,
  transition,
}: IMapSearchSurfaceProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-background"
      style={{
        clipPath: open ? FULL_CLIP : frameClip(frame),
        opacity: open ? 1 : 0,
        transition,
      }}
    />
  );
}
