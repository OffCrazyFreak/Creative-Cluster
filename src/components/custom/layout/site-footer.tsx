import { Link } from "@tanstack/react-router";

import EuEmblem from "@/features/legal/components/eu-emblem";
import EscoFooterNote from "@/features/tags/components/esco-footer-note";
import { site } from "@/sites";
import { m } from "@/paraglide/messages";

export default function SiteFooter() {
  return (
    <footer className="border-t text-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-8">
        {site.showFundingLine && (
          <div className="flex flex-wrap items-center gap-4">
            <EuEmblem height={40} />
            <p className="min-w-[16rem] flex-1">{m.common_footer_funding()}</p>
          </div>
        )}
        <EscoFooterNote />
        <ul className="flex flex-wrap gap-x-4 [&_a]:inline-block [&_a]:py-2">
          <li>
            <Link to="/about">{m.common_nav_about()}</Link>
          </li>
          <li>
            <Link to="/help">{m.common_nav_help()}</Link>
          </li>
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
      </div>
    </footer>
  );
}
