import { useId } from "react";

import type { IConnectionItem } from "../connections-schemas";
import ConnectionItem from "./connection-item";

interface IConnectionSectionProps {
  title: string;
  description?: string;
  items: IConnectionItem[];
  showSelf: boolean;
  onBehalf?: boolean;
}

export default function ConnectionSection({
  title,
  description,
  items,
  showSelf,
  onBehalf,
}: IConnectionSectionProps) {
  const headingId = useId();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {description ? <p>{description}</p> : null}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <ConnectionItem
            key={item.id}
            item={item}
            showSelf={showSelf}
            onBehalf={onBehalf}
          />
        ))}
      </ul>
    </section>
  );
}
