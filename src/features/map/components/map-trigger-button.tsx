import { SlidersHorizontalIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

type IMapTriggerButtonProps = ComponentProps<typeof Button>;

export default function MapTriggerButton(props: IMapTriggerButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={m.map_filters_button()}
      {...props}
    >
      <SlidersHorizontalIcon aria-hidden="true" />
      {m.map_filters_button()}
    </Button>
  );
}
