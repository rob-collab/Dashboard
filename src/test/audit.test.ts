import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/store", () => ({
  useAppStore: {
    getState: vi.fn(),
  },
}));

import { useAppStore } from "@/lib/store";
import { getActionLabel, logAuditEvent } from "@/lib/audit";

// ── getActionLabel ────────────────────────────────────────────────────────────

describe("getActionLabel", () => {
  it("login → 'Logged in'", () => {
    expect(getActionLabel("login")).toBe("Logged in");
  });

  it("logout → 'Logged out'", () => {
    expect(getActionLabel("logout")).toBe("Logged out");
  });

  it("create_report → 'Created report'", () => {
    expect(getActionLabel("create_report")).toBe("Created report");
  });

  it("edit_report → 'Edited report'", () => {
    expect(getActionLabel("edit_report")).toBe("Edited report");
  });

  it("publish_report → 'Published report'", () => {
    expect(getActionLabel("publish_report")).toBe("Published report");
  });

  it("archive_report → 'Archived report'", () => {
    expect(getActionLabel("archive_report")).toBe("Archived report");
  });

  it("download_export → 'Downloaded export'", () => {
    expect(getActionLabel("download_export")).toBe("Downloaded export");
  });

  it("create_action → 'Created action'", () => {
    expect(getActionLabel("create_action")).toBe("Created action");
  });

  it("complete_action → 'Completed action'", () => {
    expect(getActionLabel("complete_action")).toBe("Completed action");
  });

  it("delete_action → 'Deleted action'", () => {
    expect(getActionLabel("delete_action")).toBe("Deleted action");
  });

  it("approve_change → 'Approved proposed change'", () => {
    expect(getActionLabel("approve_change")).toBe("Approved proposed change");
  });

  it("reject_change → 'Rejected proposed change'", () => {
    expect(getActionLabel("reject_change")).toBe("Rejected proposed change");
  });

  it("modify_permissions → 'Modified permissions'", () => {
    expect(getActionLabel("modify_permissions")).toBe("Modified permissions");
  });

  it("add_user → 'Added user'", () => {
    expect(getActionLabel("add_user")).toBe("Added user");
  });

  it("send_reminder → 'Sent action reminders'", () => {
    expect(getActionLabel("send_reminder")).toBe("Sent action reminders");
  });

  it("import_actions → 'Imported actions from CSV'", () => {
    expect(getActionLabel("import_actions")).toBe("Imported actions from CSV");
  });

  it("returns the raw action key for an unknown action", () => {
    expect(getActionLabel("unknown_action")).toBe("unknown_action");
  });

  it("returns the raw key for an empty string", () => {
    expect(getActionLabel("")).toBe("");
  });
});

// ── logAuditEvent ─────────────────────────────────────────────────────────────

describe("logAuditEvent", () => {
  const addAuditLog = vi.fn();

  beforeEach(() => {
    addAuditLog.mockReset();
  });

  it("calls addAuditLog with a correctly shaped entry when user is present", () => {
    vi.mocked(useAppStore.getState).mockReturnValue({
      currentUser: { id: "u1", role: "CCRO_TEAM" },
      addAuditLog,
    } as never);

    logAuditEvent({ action: "create_report", entityType: "report", entityId: "r1" });

    expect(addAuditLog).toHaveBeenCalledOnce();
    const entry = addAuditLog.mock.calls[0][0];
    expect(entry.userId).toBe("u1");
    expect(entry.userRole).toBe("CCRO_TEAM");
    expect(entry.action).toBe("create_report");
    expect(entry.entityType).toBe("report");
    expect(entry.entityId).toBe("r1");
  });

  it("uses 'unknown' userId and 'VIEWER' role when currentUser is null", () => {
    vi.mocked(useAppStore.getState).mockReturnValue({
      currentUser: null,
      addAuditLog,
    } as never);

    logAuditEvent({ action: "login", entityType: "session" });

    const entry = addAuditLog.mock.calls[0][0];
    expect(entry.userId).toBe("unknown");
    expect(entry.userRole).toBe("VIEWER");
  });

  it("entry id starts with 'log-'", () => {
    vi.mocked(useAppStore.getState).mockReturnValue({
      currentUser: { id: "u2", role: "OWNER" },
      addAuditLog,
    } as never);

    logAuditEvent({ action: "edit_report", entityType: "report" });

    const entry = addAuditLog.mock.calls[0][0];
    expect(entry.id).toMatch(/^log-/);
  });

  it("entry timestamp is a valid ISO string", () => {
    vi.mocked(useAppStore.getState).mockReturnValue({
      currentUser: { id: "u3", role: "CEO" },
      addAuditLog,
    } as never);

    logAuditEvent({ action: "view_report", entityType: "report" });

    const entry = addAuditLog.mock.calls[0][0];
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it("sets optional fields to null when not provided", () => {
    vi.mocked(useAppStore.getState).mockReturnValue({
      currentUser: { id: "u4", role: "CCRO_TEAM" },
      addAuditLog,
    } as never);

    logAuditEvent({ action: "login", entityType: "session" });

    const entry = addAuditLog.mock.calls[0][0];
    expect(entry.entityId).toBeNull();
    expect(entry.changes).toBeNull();
    expect(entry.reportId).toBeNull();
    expect(entry.ipAddress).toBeNull();
    expect(entry.userAgent).toBeNull();
  });

  it("passes changes and reportId when provided", () => {
    vi.mocked(useAppStore.getState).mockReturnValue({
      currentUser: { id: "u5", role: "CCRO_TEAM" },
      addAuditLog,
    } as never);

    logAuditEvent({
      action: "edit_report",
      entityType: "report",
      reportId: "rpt-1",
      changes: { title: "New Title" },
    });

    const entry = addAuditLog.mock.calls[0][0];
    expect(entry.reportId).toBe("rpt-1");
    expect(entry.changes).toEqual({ title: "New Title" });
  });
});
