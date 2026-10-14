import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";

interface IEuEmblemProps {
  height?: number;
}

// Official files from the EU logo download centre, unmodified; width follows the file ratio.
const RATIO: Record<string, number> = { en: 4119 / 919, hr: 3502 / 919 };

export default function EuEmblem({ height = 48 }: IEuEmblemProps) {
  const locale = getLocale();
  return (
    <img
      src={`/eu/co-funded-${locale}.png`}
      alt={m.legal_eu_emblem_alt()}
      height={height}
      width={Math.round(height * RATIO[locale])}
      loading="lazy"
    />
  );
}
