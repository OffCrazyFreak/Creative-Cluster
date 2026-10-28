// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { m } from "@/paraglide/messages";

import { getSavedEntries, replaceSavedEntries } from "../saved.functions";
import { useSavedEntries } from "../hooks/use-saved-entries";
import type { ISavedEntry } from "../saved-schemas";
import SaveEntryButton from "./save-entry-button";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const navigate = vi.fn();
let viewer: { id: string } | null = { id: "u1" };

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    navigate,
    state: { location: { href: "/e/kiln?x=1" } },
  }),
}));
vi.mock("@/features/session/session-queries", () => ({
  viewerQueryOptions: () => ({
    queryKey: ["viewer"],
    queryFn: () => Promise.resolve(viewer),
  }),
}));
vi.mock("../saved.functions", () => ({
  getSavedEntries: vi.fn(),
  replaceSavedEntries: vi.fn(),
}));

const KILN = { slug: "kiln", name: "Kiln" };
let root: Root;
let host: HTMLDivElement;

function saved(slugs: string[]): ISavedEntry[] {
  return slugs.map((slug) => ({ id: slug, slug, name: slug }));
}

function render(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  act(() =>
    root.render(
      <QueryClientProvider client={client}>{node}</QueryClientProvider>,
    ),
  );
}

// The saved list waits for the viewer query, so a few ticks pass before it lands.
async function settle() {
  for (let tick = 0; tick < 5; tick++)
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

// Like the map list: a saved row sits in another <ul>, so its star remounts.
function GroupedList() {
  const { isSaved } = useSavedEntries();
  const star = <SaveEntryButton entry={KILN} />;
  return isSaved(KILN.slug) ? (
    <ul key="saved">
      <li>{star}</li>
    </ul>
  ) : (
    <ul key="rest">
      <li>{star}</li>
    </ul>
  );
}

function button(name: string) {
  return host.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
}

beforeEach(() => {
  viewer = { id: "u1" };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  vi.mocked(toast.error).mockClear();
  navigate.mockClear();
  vi.mocked(replaceSavedEntries).mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
});

describe("SaveEntryButton", () => {
  it("adds the entry to the saved list and shows it as saved", async () => {
    let stored = saved(["a"]);
    vi.mocked(getSavedEntries).mockImplementation(() =>
      Promise.resolve(stored),
    );
    vi.mocked(replaceSavedEntries).mockImplementation(({ data }) => {
      stored = saved(data.keys);
      return Promise.resolve(stored);
    });
    render(<SaveEntryButton entry={KILN} />);
    await settle();

    act(() => button(m.map_save(KILN))?.click());
    await settle();

    expect(replaceSavedEntries).toHaveBeenCalledWith({
      data: { keys: ["a", "kiln"] },
    });
    expect(button(m.map_unsave(KILN))).not.toBeNull();
  });

  it("refuses an eleventh entry without asking the server", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => `e${i}`);
    vi.mocked(getSavedEntries).mockResolvedValue(saved(ten));
    render(<SaveEntryButton entry={KILN} />);
    await settle();

    act(() => button(m.map_save(KILN))?.click());

    expect(toast.error).toHaveBeenCalledWith(m.map_saved_limit({ max: 10 }));
    expect(replaceSavedEntries).not.toHaveBeenCalled();
  });

  it("does not save before the saved list has loaded", async () => {
    vi.mocked(getSavedEntries).mockReturnValue(new Promise(() => {}));
    render(<SaveEntryButton entry={KILN} />);
    await settle();

    act(() => button(m.map_save(KILN))?.click());

    expect(toast.error).toHaveBeenCalledWith(m.map_saved_failed());
    expect(replaceSavedEntries).not.toHaveBeenCalled();
  });

  it("puts the star back when the save fails", async () => {
    vi.mocked(getSavedEntries).mockResolvedValue(saved(["kiln"]));
    vi.mocked(replaceSavedEntries).mockRejectedValue(new Error("down"));
    render(<SaveEntryButton entry={KILN} />);
    await settle();

    act(() => button(m.map_unsave(KILN))?.click());
    await settle();

    expect(toast.error).toHaveBeenCalledWith(m.map_saved_failed());
    expect(button(m.map_unsave(KILN))).not.toBeNull();
  });

  it("keeps focus on the star when saving moves its row to another group", async () => {
    let stored = saved([]);
    vi.mocked(getSavedEntries).mockImplementation(() =>
      Promise.resolve(stored),
    );
    vi.mocked(replaceSavedEntries).mockImplementation(({ data }) => {
      stored = saved(data.keys);
      return Promise.resolve(stored);
    });
    render(<GroupedList />);
    await settle();

    const before = button(m.map_save(KILN));
    act(() => before?.focus());
    act(() => before?.click());
    await settle();

    const after = button(m.map_unsave(KILN));
    expect(after).not.toBe(before);
    expect(document.activeElement).toBe(after);
  });

  it("sends a guest to log in and back", async () => {
    viewer = null;
    render(<SaveEntryButton entry={KILN} />);
    await settle();

    act(() => button(m.map_save(KILN))?.click());

    expect(navigate).toHaveBeenCalledWith({
      to: "/login",
      search: { redirect: "/e/kiln?x=1" },
    });
  });
});
