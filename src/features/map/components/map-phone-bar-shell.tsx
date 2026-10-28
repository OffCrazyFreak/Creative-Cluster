// Holds the phone bar's place while its code loads, so the site header never flashes back in.
export default function MapPhoneBarShell() {
  return (
    <div
      data-map-bar=""
      aria-hidden="true"
      className="absolute inset-x-2 top-2 z-20 flex items-center gap-2 rounded-xl border bg-background p-1"
    >
      <div className="h-9 flex-1" />
    </div>
  );
}
