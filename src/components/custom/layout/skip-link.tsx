import { m } from "@/paraglide/messages";

export default function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
    >
      {m.common_skip_to_content()}
    </a>
  );
}
