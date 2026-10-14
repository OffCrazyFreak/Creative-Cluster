import { m } from "@/paraglide/messages";

import DataExportSection from "./data-export-section";
import ErasureSection from "./erasure-section";
import ListingStatusPanel from "./listing-status-panel";

export default function AccountDataPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">{m.lifecycle_data_title()}</h1>
      <ListingStatusPanel />
      <DataExportSection />
      <ErasureSection />
    </section>
  );
}
