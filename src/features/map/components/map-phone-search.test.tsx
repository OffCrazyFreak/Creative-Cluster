// @vitest-environment jsdom
import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { m } from "@/paraglide/messages";

import MapPhoneSearch from "./map-phone-search";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Harness({ onOuterEscape }: { onOuterEscape: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") onOuterEscape();
      }}
    >
      <MapPhoneSearch
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        containerRef={containerRef}
        barRef={barRef}
        menu={<button type="button">menu</button>}
        account={null}
        renderField={(inputRef) => (
          <input ref={inputRef} type="search" aria-label="search" />
        )}
      >
        <p>entry list</p>
      </MapPhoneSearch>
    </div>
  );
}

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  // jsdom has no ResizeObserver or matchMedia; the bar's box only drives the animation.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function render(onOuterEscape = vi.fn()) {
  act(() => root.render(<Harness onOuterEscape={onOuterEscape} />));
  const field = host.querySelector("input") as HTMLInputElement;
  return { field, onOuterEscape };
}

function backButton() {
  return host.querySelector<HTMLButtonElement>(
    `button[aria-label="${m.map_back_to_map()}"]`,
  );
}

function fire(target: EventTarget | null, event: Event) {
  act(() => {
    target?.dispatchEvent(event);
  });
}

// A keyboard press reports no clicks in detail.
function pressBack(detail: number) {
  fire(backButton(), new MouseEvent("click", { bubbles: true, detail }));
}

describe("MapPhoneSearch", () => {
  it("opens on a press of the field, and the back arrow closes it", () => {
    const { field } = render();
    expect(host.textContent).not.toContain("entry list");

    fire(field, new Event("pointerdown", { bubbles: true }));
    expect(host.textContent).toContain("entry list");
    expect(host.textContent).not.toContain("menu");

    pressBack(1);
    expect(host.textContent).not.toContain("entry list");
    expect(host.textContent).toContain("menu");
    expect(document.activeElement).not.toBe(field);
  });

  it("keeps Escape to itself and hands focus back to the field", () => {
    const { field, onOuterEscape } = render();
    act(() => field.focus());
    expect(host.textContent).toContain("entry list");

    fire(field, new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(onOuterEscape).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain("entry list");
    expect(document.activeElement).toBe(field);
  });

  it("hands focus back to the field when a key presses the back arrow", () => {
    const { field } = render();
    act(() => field.focus());

    pressBack(0);

    expect(host.textContent).not.toContain("entry list");
    expect(document.activeElement).toBe(field);
  });
});
