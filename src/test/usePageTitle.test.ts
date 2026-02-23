import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageTitle } from "@/lib/usePageTitle";

const BASE = "Updraft CCRO Dashboard";

afterEach(() => {
  document.title = "";
});

// ── usePageTitle ──────────────────────────────────────────────────────────────

describe("usePageTitle", () => {
  it("sets document.title to 'Page | Base' when a title is provided", () => {
    renderHook(() => usePageTitle("Risk Register"));
    expect(document.title).toBe(`Risk Register | ${BASE}`);
  });

  it("sets document.title to the base title when no argument is passed", () => {
    renderHook(() => usePageTitle());
    expect(document.title).toBe(BASE);
  });

  it("sets document.title to the base title when undefined is passed explicitly", () => {
    renderHook(() => usePageTitle(undefined));
    expect(document.title).toBe(BASE);
  });

  it("updates document.title when the title prop changes", () => {
    let title = "Dashboard";
    const { rerender } = renderHook(() => usePageTitle(title));
    expect(document.title).toBe(`Dashboard | ${BASE}`);

    title = "Actions";
    rerender();
    expect(document.title).toBe(`Actions | ${BASE}`);
  });

  it("resets document.title to the base title on unmount", () => {
    const { unmount } = renderHook(() => usePageTitle("Settings"));
    expect(document.title).toBe(`Settings | ${BASE}`);
    unmount();
    expect(document.title).toBe(BASE);
  });

  it("handles an empty string title as falsy and shows the base title", () => {
    renderHook(() => usePageTitle(""));
    expect(document.title).toBe(BASE);
  });
});
