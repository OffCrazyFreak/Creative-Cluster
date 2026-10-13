import { Link } from "@tanstack/react-router";

import { site } from "@/sites";
import { m } from "@/paraglide/messages";

export default function SiteFooter() {
  return (
    <footer className="flex flex-col gap-4 border-t p-4 text-sm">
      {site.showFundingLine && <p>{m.common_footer_funding()}</p>}
      <ul className="flex flex-wrap gap-4">
        <li>
          <Link to="/privacy">{m.common_footer_privacy()}</Link>
        </li>
        <li>
          <Link to="/terms">{m.common_footer_terms()}</Link>
        </li>
        <li>
          <Link to="/imprint">{m.common_footer_imprint()}</Link>
        </li>
        <li>
          <Link to="/accessibility">{m.common_footer_accessibility()}</Link>
        </li>
      </ul>
    </footer>
  );
}
