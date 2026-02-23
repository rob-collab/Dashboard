import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Set RESEND_API_KEY before the email module is imported ────────────────────
// vi.hoisted runs before any imports, ensuring the module-level `resend`
// assignment sees the key.
const mockSend = vi.hoisted(() => {
  process.env.RESEND_API_KEY = "test-resend-key";
  return vi.fn();
});

// Mock the resend package so no real HTTP is made.
// Must use a class (not an arrow function) so `new Resend(key)` works.
vi.mock("resend", () => {
  class MockResend {
    emails = { send: mockSend };
  }
  return { Resend: MockResend };
});

import { sendActionAssigned, sendActionReminder } from "@/lib/email";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const assignee = { name: "Alice", email: "alice@example.com" };

const baseData = {
  actionTitle: "Review Policy",
  actionDescription: "Check the FCA policy is up to date.",
  reportTitle: "Q1 Report",
  reportPeriod: "Jan–Mar 2025",
  sectionTitle: "Compliance",
  dueDate: null,
  actionId: "action-abc",
};

// ── sendActionAssigned ────────────────────────────────────────────────────────

describe("sendActionAssigned", () => {
  beforeEach(() => {
    mockSend.mockReset();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
  });

  it("calls resend.emails.send with correct recipient", async () => {
    mockSend.mockResolvedValue({ id: "email-1" });
    await sendActionAssigned(baseData, assignee);
    expect(mockSend).toHaveBeenCalledOnce();
    const [call] = mockSend.mock.calls;
    expect(call[0].to).toBe("alice@example.com");
  });

  it("subjects the email with the action title", async () => {
    mockSend.mockResolvedValue({ id: "email-2" });
    await sendActionAssigned(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].subject).toContain("Review Policy");
  });

  it("includes the assignee name in the email body", async () => {
    mockSend.mockResolvedValue({ id: "email-3" });
    await sendActionAssigned(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("Alice");
  });

  it("includes a link to the action", async () => {
    mockSend.mockResolvedValue({ id: "email-4" });
    await sendActionAssigned(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("action-abc");
  });

  it("returns success:true on a successful send", async () => {
    mockSend.mockResolvedValue({ id: "email-5" });
    const result = await sendActionAssigned(baseData, assignee);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns success:false and an error message when send throws", async () => {
    mockSend.mockRejectedValue(new Error("Network failure"));
    const result = await sendActionAssigned(baseData, assignee);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Network failure");
  });

  it("uses NEXT_PUBLIC_APP_URL in the action link when set", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    mockSend.mockResolvedValue({ id: "email-6" });
    await sendActionAssigned(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("https://app.example.com");
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("uses VERCEL_URL when NEXT_PUBLIC_APP_URL is absent", async () => {
    process.env.VERCEL_URL = "my-app.vercel.app";
    mockSend.mockResolvedValue({ id: "email-7" });
    await sendActionAssigned(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("my-app.vercel.app");
    delete process.env.VERCEL_URL;
  });

  it("falls back to localhost when neither URL env var is set", async () => {
    mockSend.mockResolvedValue({ id: "email-8" });
    await sendActionAssigned(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("localhost:3000");
  });

  it("shows 'No due date set' when dueDate is null", async () => {
    mockSend.mockResolvedValue({ id: "email-9" });
    await sendActionAssigned({ ...baseData, dueDate: null }, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("No due date set");
  });

  it("formats a dueDate ISO string as a readable date in the body", async () => {
    mockSend.mockResolvedValue({ id: "email-10" });
    await sendActionAssigned({ ...baseData, dueDate: "2025-12-31" }, assignee);
    const [call] = mockSend.mock.calls;
    // en-GB long format contains the year
    expect(call[0].html).toContain("2025");
  });
});

// ── sendActionReminder ────────────────────────────────────────────────────────

describe("sendActionReminder", () => {
  beforeEach(() => {
    mockSend.mockReset();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
  });

  it("calls resend.emails.send with the correct recipient", async () => {
    mockSend.mockResolvedValue({ id: "rem-1" });
    await sendActionReminder(baseData, assignee);
    expect(mockSend).toHaveBeenCalledOnce();
    const [call] = mockSend.mock.calls;
    expect(call[0].to).toBe("alice@example.com");
  });

  it("includes 'Action Reminder' in the subject", async () => {
    mockSend.mockResolvedValue({ id: "rem-2" });
    await sendActionReminder(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].subject).toContain("Action Reminder");
  });

  it("includes the action title in the subject", async () => {
    mockSend.mockResolvedValue({ id: "rem-3" });
    await sendActionReminder(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].subject).toContain("Review Policy");
  });

  it("adds 'Urgent: ' prefix when due within 7 days", async () => {
    // Set due date 3 days from now
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    mockSend.mockResolvedValue({ id: "rem-4" });
    await sendActionReminder({ ...baseData, dueDate: soon }, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].subject).toMatch(/^Urgent:/);
  });

  it("does not add 'Urgent: ' prefix when due more than 7 days away", async () => {
    const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockSend.mockResolvedValue({ id: "rem-5" });
    await sendActionReminder({ ...baseData, dueDate: later }, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].subject).not.toContain("Urgent:");
  });

  it("shows 'overdue' text in the body when action is past due date", async () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    mockSend.mockResolvedValue({ id: "rem-6" });
    await sendActionReminder({ ...baseData, dueDate: past }, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("overdue");
  });

  it("shows 'due tomorrow' text when exactly 1 day remains", async () => {
    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    mockSend.mockResolvedValue({ id: "rem-7" });
    await sendActionReminder({ ...baseData, dueDate: tomorrow }, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("tomorrow");
  });

  it("shows 'due in N days' text for dates further in the future", async () => {
    const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    mockSend.mockResolvedValue({ id: "rem-8" });
    await sendActionReminder({ ...baseData, dueDate: future }, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("days");
  });

  it("returns success:true on a successful send", async () => {
    mockSend.mockResolvedValue({ id: "rem-9" });
    const result = await sendActionReminder(baseData, assignee);
    expect(result.success).toBe(true);
  });

  it("returns success:false and error message when send throws", async () => {
    mockSend.mockRejectedValue(new Error("Timeout"));
    const result = await sendActionReminder(baseData, assignee);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Timeout");
  });

  it("includes a link containing the actionId", async () => {
    mockSend.mockResolvedValue({ id: "rem-10" });
    await sendActionReminder(baseData, assignee);
    const [call] = mockSend.mock.calls;
    expect(call[0].html).toContain("action-abc");
  });
});
