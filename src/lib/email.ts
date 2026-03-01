import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || "CCRO Dashboard <noreply@updraft.com>";

interface ActionEmailData {
  actionTitle: string;
  actionDescription: string;
  reportTitle: string | null;
  reportPeriod: string | null;
  sectionTitle: string | null;
  dueDate: string | null;
  actionId: string;
}

interface Assignee {
  name: string;
  email: string;
}

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
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
                ${data.reportTitle && data.reportPeriod ? `<tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Report:</td><td>${data.reportTitle} — ${data.reportPeriod}</td></tr>` : ''}
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

interface InviteEmailData {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  appUrl: string;
}

export async function sendUserInvite(
  data: InviteEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const firstName = data.recipientName.split(" ")[0];

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.recipientEmail,
      subject: "You've been added to the Updraft CCRO Management Tool",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1a1060, #4f46e5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 600;">Updraft CCRO Management Tool</h1>
            <p style="color: rgba(255,255,255,0.75); font-size: 13px; margin: 6px 0 0 0;">Compliance &amp; Risk Management Platform</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px; background: #ffffff;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">Hi ${firstName},</p>
            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              You have been added to the <strong>Updraft CCRO Management Tool</strong> — our centralised platform for compliance monitoring, risk management, regulatory tracking, and Consumer Duty oversight.
            </p>
            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              You can sign in using your Google account associated with this email address. Please use the button below to access the platform.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${data.appUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a1060, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;">
                Access the CCRO Tool
              </a>
            </div>
            <div style="border-top: 1px solid #f3f4f6; padding-top: 20px; margin-top: 24px;">
              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 4px 0;">
                If you have any questions, please reach out to ${data.senderName}.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This invitation was sent by ${data.senderName} from the Updraft CCRO Team.
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Failed to send invite email:", msg);
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
                ${data.reportTitle && data.reportPeriod ? `<tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Report:</td><td>${data.reportTitle} — ${data.reportPeriod}</td></tr>` : ''}
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

// ── Risk Acceptance Email Notifications ──────────────────────────────────────

interface RiskAcceptanceEmailData {
  reference: string;
  title: string;
  acceptanceId: string;
}

export async function sendRiskAcceptanceApprovalRequest(
  data: RiskAcceptanceEmailData,
  approver: Assignee,
  proposerName: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping risk acceptance email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const url = `${baseUrl()}/risk-acceptances?highlight=${data.acceptanceId}`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: approver.email,
      subject: `Action Required: Risk Acceptance ${data.reference} awaiting your approval`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #311B92, #673AB7); padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 18px; margin: 0;">CCRO Dashboard — Approval Required</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 14px;">Hi ${approver.name},</p>
            <p style="color: #374151; font-size: 14px;">
              ${proposerName} has submitted a risk acceptance for your approval.
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #673AB7; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #6B7280; font-size: 12px; margin: 0 0 4px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${data.reference}</p>
              <h2 style="color: #1a1060; font-size: 16px; margin: 0;">${data.title}</h2>
            </div>
            <a href="${url}" style="display: inline-block; background: #673AB7; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">Review &amp; Decide</a>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Failed to send risk acceptance approval request:", msg);
    return { success: false, error: msg };
  }
}

export async function sendRiskAcceptanceDecision(
  data: RiskAcceptanceEmailData,
  proposer: Assignee,
  decision: "APPROVED" | "REJECTED",
  deciderName: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping risk acceptance email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const url = `${baseUrl()}/risk-acceptances?highlight=${data.acceptanceId}`;
  const approved = decision === "APPROVED";

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: proposer.email,
      subject: `Risk Acceptance ${data.reference} has been ${approved ? "approved" : "rejected"}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, ${approved ? "#065F46, #059669" : "#7F1D1D, #DC2626"}); padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; font-size: 18px; margin: 0;">CCRO Dashboard — Risk Acceptance ${approved ? "Approved" : "Rejected"}</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 14px;">Hi ${proposer.name},</p>
            <p style="color: #374151; font-size: 14px;">
              ${deciderName} has <strong>${approved ? "approved" : "rejected"}</strong> your risk acceptance.
            </p>
            <div style="background: #f9fafb; border-left: 4px solid ${approved ? "#059669" : "#DC2626"}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
              <p style="color: #6B7280; font-size: 12px; margin: 0 0 4px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${data.reference}</p>
              <h2 style="color: #1a1060; font-size: 16px; margin: 0;">${data.title}</h2>
            </div>
            <a href="${url}" style="display: inline-block; background: ${approved ? "#059669" : "#DC2626"}; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">View Details</a>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Failed to send risk acceptance decision email:", msg);
    return { success: false, error: msg };
  }
}
