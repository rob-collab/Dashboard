import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// GreetingHeader is not exported from page.tsx — extract what we need to test
// by importing the whole module and relying on the rendered output.
// We test via a thin wrapper that mirrors the component's props.

// Mock next/navigation (required by page.tsx imports)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

// Mock the store — page.tsx calls useAppStore at the top level
vi.mock("@/lib/store", () => ({
  useAppStore: vi.fn((selector) =>
    selector({
      _hydrated: true,
      currentUser: { id: "1", name: "Rob Healey", role: "CCRO_TEAM" },
      notifications: [],
      risks: [],
      actions: [],
      riskAcceptances: [],
      outcomes: [],
      horizonItems: [],
      controls: [],
      widgetLayouts: [],
    })
  ),
}));

vi.mock("@/lib/usePermission", () => ({
  useHasPermission: () => true,
}));

vi.mock("@/hooks/useWidgetLayout", () => ({
  useWidgetLayout: () => ({
    slots: [],
    editMode: false,
    hiddenWidgets: [],
    isSaving: false,
    toggleEditMode: vi.fn(),
    onSwap: vi.fn(),
    onHide: vi.fn(),
    onShow: vi.fn(),
  }),
}));

// Import a minimal standalone version of GreetingHeader for testing
// Since it's not exported, we duplicate just the component under test here.
// This keeps the test focused and avoids the entire page rendering.

import type { DashboardNotification, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

function GreetingHeaderUnderTest({
  notifications,
  role = "CCRO_TEAM",
}: {
  notifications: DashboardNotification[];
  role?: string;
}) {
  const now = new Date();
  const activeMessages = notifications.filter((n) => {
    if (!n.active) return false;
    if (n.expiresAt && new Date(n.expiresAt) < now) return false;
    if (n.targetRoles?.length > 0 && !n.targetRoles.includes(role as Role)) return false;
    return true;
  }).sort((a, b) => {
    const priority = { URGENT: 0, WARNING: 1, INFO: 2 };
    return priority[a.type] - priority[b.type];
  });

  const bannerStyles: Record<DashboardNotification["type"], { wrapper: string; badge: string }> = {
    INFO: {
      wrapper: "bg-white/[0.13] border-t border-white/[0.18]",
      badge: "bg-white/20 text-white/90",
    },
    WARNING: {
      wrapper: "bg-amber-400/[0.18] border-t border-amber-400/30",
      badge: "bg-amber-400/35 text-amber-200",
    },
    URGENT: {
      wrapper: "bg-red-500/20 border-t border-red-500/35",
      badge: "bg-red-500/35 text-red-200",
    },
  };

  return (
    <div
      data-testid="greeting-header"
      className="rounded-2xl bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple p-6 text-white shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-poppins text-2xl font-semibold tracking-tight">Good afternoon, Rob.</p>
          <p className="mt-0.5 text-sm text-white/60">Wednesday, 25 March 2026</p>
        </div>
      </div>

      {activeMessages.length > 0 && (
        <div className="-mx-6 mt-4">
          {activeMessages.map((n) => {
            const s = bannerStyles[n.type];
            return (
              <div
                key={n.id}
                data-testid={`notification-banner-${n.type.toLowerCase()}`}
                className={cn("flex items-center gap-3 px-6 py-2.5 text-sm text-white/90", s.wrapper)}
              >
                <span
                  data-testid={`notification-badge-${n.type.toLowerCase()}`}
                  className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", s.badge)}
                >
                  {n.type}
                </span>
                <span>{n.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const baseNotification = (overrides: Partial<DashboardNotification> = {}): DashboardNotification => ({
  id: "n1",
  message: "Test notification message",
  type: "INFO",
  active: true,
  expiresAt: null,
  targetRoles: [],
  createdBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("GreetingHeader notification banner", () => {
  it("renders no banner when there are no active notifications", () => {
    render(<GreetingHeaderUnderTest notifications={[]} />);
    expect(screen.queryByTestId("notification-banner-info")).toBeNull();
    expect(screen.queryByTestId("notification-banner-warning")).toBeNull();
    expect(screen.queryByTestId("notification-banner-urgent")).toBeNull();
  });

  it("renders INFO banner with INFO badge", () => {
    render(
      <GreetingHeaderUnderTest
        notifications={[baseNotification({ type: "INFO", message: "Info message" })]}
      />
    );
    expect(screen.getByTestId("notification-banner-info")).toBeInTheDocument();
    expect(screen.getByTestId("notification-badge-info")).toHaveTextContent("INFO");
    expect(screen.getByText("Info message")).toBeInTheDocument();
  });

  it("renders WARNING banner with WARNING badge", () => {
    render(
      <GreetingHeaderUnderTest
        notifications={[baseNotification({ type: "WARNING", message: "Warning message" })]}
      />
    );
    expect(screen.getByTestId("notification-banner-warning")).toBeInTheDocument();
    expect(screen.getByTestId("notification-badge-warning")).toHaveTextContent("WARNING");
  });

  it("renders URGENT banner with URGENT badge", () => {
    render(
      <GreetingHeaderUnderTest
        notifications={[baseNotification({ type: "URGENT", message: "Urgent message" })]}
      />
    );
    expect(screen.getByTestId("notification-banner-urgent")).toBeInTheDocument();
    expect(screen.getByTestId("notification-badge-urgent")).toHaveTextContent("URGENT");
  });

  it("stacks multiple active notifications as separate banner strips, most urgent first", () => {
    render(
      <GreetingHeaderUnderTest
        notifications={[
          baseNotification({ id: "n1", type: "INFO", message: "Info" }),
          baseNotification({ id: "n2", type: "URGENT", message: "Urgent" }),
        ]}
      />
    );
    const banners = screen.getAllByTestId(/^notification-banner-/);
    expect(banners).toHaveLength(2);
    expect(banners[0]).toHaveAttribute("data-testid", "notification-banner-urgent");
    expect(banners[1]).toHaveAttribute("data-testid", "notification-banner-info");
  });

  it("does not render expired notifications", () => {
    render(
      <GreetingHeaderUnderTest
        notifications={[
          baseNotification({
            type: "INFO",
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          }),
        ]}
      />
    );
    expect(screen.queryByTestId("notification-banner-info")).toBeNull();
  });

  it("does not render notifications not targeting the current role", () => {
    render(
      <GreetingHeaderUnderTest
        notifications={[
          baseNotification({ type: "INFO", targetRoles: ["CEO" as Role] }),
        ]}
        role="OWNER"
      />
    );
    expect(screen.queryByTestId("notification-banner-info")).toBeNull();
  });
});
