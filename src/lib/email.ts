import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || "CCRO Dashboard <noreply@updraft.com>";

interface ActionEmailData {
  actionTitle: string;
  actionDescription: string;
  reportTitle: string;
  reportPeriod: string;
  sectionTitle: string | null;
  dueDate: string | null;
  actionId: string;
}

interface Assignee {
  name: string;
  email: string;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "No due date set";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntilDue(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  const due = new Date(iso);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function sendActionAssigned(
  data: ActionEmailData,
  assignee: Assignee
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const actionUrl = `${baseUrl()}/actions?highlight=${data.actionId}`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: assignee.email,
      subject: `Action Assigned: ${data.actionTitle}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1a1060, #4f46e5); padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 18px; margin: 0;">CCRO Dashboard — New Action</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 14px;">Hi ${assignee.name},</p>
            <p style="color: #374151; font-size: 14px;">You have been assigned a new action:</p>
            <div style="background: #f9fafb; border-left: 4px solid #4f46e5; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <h2 style="color: #1a1060; font-size: 16px; margin: 0 0 8px 0;">${data.actionTitle}</h2>
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">${data.actionDescription || "No description provided."}</p>
              <table style="font-size: 13px; color: #374151;">
                <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Report:</td><td>${data.reportTitle} — ${data.reportPeriod}</td></tr>
                ${data.sectionTitle ? `<tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Section:</td><td>${data.sectionTitle}</td></tr>` : ""}
                <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Due Date:</td><td>${formatDueDate(data.dueDate)}</td></tr>
              </table>
            </div>
            <a href="${actionUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">View Action</a>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Failed to send assignment email:", msg);
    return { success: false, error: msg };
  }
}

export async function sendActionReminder(
  data: ActionEmailData,
  assignee: Assignee
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const actionUrl = `${baseUrl()}/actions?highlight=${data.actionId}`;
  const days = daysUntilDue(data.dueDate);
  const urgency = days !== null && days <= 7 ? "Urgent: " : "";
  const daysText =
    days !== null
      ? days <= 0
        ? "This action is overdue!"
        : days === 1
          ? "This action is due tomorrow."
          : `This action is due in ${days} days.`
      : "";

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: assignee.email,
      subject: `${urgency}Action Reminder: ${data.actionTitle}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1a1060, #4f46e5); padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 18px; margin: 0;">CCRO Dashboard — Action Reminder</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 14px;">Hi ${assignee.name},</p>
            <p style="color: ${days !== null && days <= 0 ? "#dc2626" : "#374151"}; font-size: 14px; font-weight: ${days !== null && days <= 7 ? "600" : "400"};">${daysText}</p>
            <div style="background: #f9fafb; border-left: 4px solid ${days !== null && days <= 0 ? "#dc2626" : days !== null && days <= 7 ? "#f59e0b" : "#4f46e5"}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <h2 style="color: #1a1060; font-size: 16px; margin: 0 0 8px 0;">${data.actionTitle}</h2>
              <table style="font-size: 13px; color: #374151;">
                <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Report:</td><td>${data.reportTitle} — ${data.reportPeriod}</td></tr>
                <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Due Date:</td><td style="color: ${days !== null && days <= 0 ? "#dc2626" : "inherit"}; font-weight: ${days !== null && days <= 0 ? "600" : "400"};">${formatDueDate(data.dueDate)}</td></tr>
              </table>
            </div>
            <a href="${actionUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">View Action</a>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Failed to send reminder email:", msg);
    return { success: false, error: msg };
  }
}
