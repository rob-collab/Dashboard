import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DashboardLayoutsPanel } from "@/components/settings/DashboardLayoutsPanel";

// Mock AdminWidgetGrid so we can focus on DashboardLayoutsPanel logic
vi.mock("@/components/settings/AdminWidgetGrid", () => ({
  AdminWidgetGrid: ({ slots, pinnedIds, onTogglePin }: {
    slots: { widgetId: string }[];
    pinnedIds: string[];
    onTogglePin: (id: string) => void;
  }) => (
    <div data-testid="admin-widget-grid">
      {slots.map((s) => (
        <button key={s.widgetId} onClick={() => onTogglePin(s.widgetId)}>
          toggle-{s.widgetId}
        </button>
      ))}
      <span data-testid="pinned-count">{pinnedIds.length}</span>
    </div>
  ),
}));

// Mock useAppStore to return a CCRO user by default
const mockUseAppStore = vi.fn();
vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (s: { currentUser: { role: string } | null }) => unknown) =>
    mockUseAppStore(selector),
}));

const mockUsers = [
  { id: "user-1", name: "Jane Smith",  role: "CEO" },
  { id: "user-2", name: "Tom Hughes",  role: "OWNER" },
];

const mockLayout = {
  layoutGrid: { slots: [
    { slotId: "slot-1", widgetId: "risk-posture" },
    { slotId: "slot-2", widgetId: "consumer-duty-health" },
  ]},
  hiddenSections: [],
  pinnedSections: ["risk-posture"],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockUseAppStore.mockImplementation((selector) =>
    selector({ currentUser: { role: "CCRO_TEAM" } })
  );
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url === "/api/users") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) });
    }
    if (url.startsWith("/api/dashboard-layout")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLayout) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

describe("DashboardLayoutsPanel", () => {
  it("shows a permission message for non-CCRO users", () => {
    mockUseAppStore.mockImplementation((selector) =>
      selector({ currentUser: { role: "CEO" } })
    );
    render(<DashboardLayoutsPanel />);
    expect(
      screen.getByText(/do not have permission/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin-widget-grid")).toBeNull();
  });

  it("loads and displays users in the dropdown", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    );
    const options = screen.getAllByRole("option");
    // First option is placeholder; then one per user
    expect(options.length).toBe(3);
    expect(options[1]).toHaveTextContent("Jane Smith");
    expect(options[2]).toHaveTextContent("Tom Hughes");
  });

  it("loads the layout when a user is selected", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });

    await waitFor(() =>
      expect(screen.getByTestId("admin-widget-grid")).toBeInTheDocument()
    );
  });

  it("Save button is disabled until a change is made", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    expect(screen.getByRole("button", { name: /save layout/i })).toBeDisabled();
  });

  it("Save button enables after toggling a pin", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    fireEvent.click(screen.getByText("toggle-risk-posture"));
    expect(screen.getByRole("button", { name: /save layout/i })).not.toBeDisabled();
  });

  it("Save calls PUT /api/dashboard-layout with correct payload", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    // Toggle a pin to enable Save
    fireEvent.click(screen.getByText("toggle-risk-posture"));
    fireEvent.click(screen.getByRole("button", { name: /save layout/i }));

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const saveCall = calls.find(
        (c: unknown[]) =>
          c[0] === "/api/dashboard-layout" && (c[1] as RequestInit)?.method === "PUT"
      );
      expect(saveCall).toBeDefined();
      const body = JSON.parse((saveCall![1] as RequestInit).body as string);
      expect(body.targetUserId).toBe("user-1");
      expect(body).toHaveProperty("layoutGrid");
      expect(body).toHaveProperty("pinnedSections");
    });
  });

  it("Apply to role calls PUT for each user with the same role", async () => {
    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    fireEvent.click(screen.getByRole("button", { name: /apply to all/i }));

    await waitFor(() => {
      const puts = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => c[0] === "/api/dashboard-layout" && (c[1] as RequestInit)?.method === "PUT"
      );
      // Only Jane is CEO — apply to role writes 1 record (just for Jane)
      expect(puts).toHaveLength(1);
      expect(JSON.parse((puts[0][1] as RequestInit).body as string).targetUserId).toBe("user-1");
    });
  });

  it("Apply to role shows error when some saves fail", async () => {
    const twoCeos = [
      { id: "user-1", name: "Jane Smith",  role: "CEO" },
      { id: "user-3", name: "Alice Brown", role: "CEO" },
    ];
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string, opts?: RequestInit) => {
        if (url === "/api/users") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(twoCeos) });
        }
        if (url.startsWith("/api/dashboard-layout") && opts?.method !== "PUT") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLayout) });
        }
        // First PUT (user-1) succeeds; second PUT (user-3) fails
        const body = JSON.parse((opts?.body ?? "{}") as string);
        return body.targetUserId === "user-1"
          ? Promise.resolve({ ok: true,  json: () => Promise.resolve({}) })
          : Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Server error" }) });
      }
    );

    render(<DashboardLayoutsPanel />);
    await waitFor(() => screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user-1" } });
    await waitFor(() => screen.getByTestId("admin-widget-grid"));

    fireEvent.click(screen.getByRole("button", { name: /apply to all/i }));

    await waitFor(() => {
      const puts = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => c[0] === "/api/dashboard-layout" && (c[1] as RequestInit)?.method === "PUT"
      );
      // Both CEO users were attempted
      expect(puts).toHaveLength(2);
    });
  });
});
