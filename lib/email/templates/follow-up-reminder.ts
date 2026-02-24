/* ------------------------------------------------------------------ */
/*  Follow-up Reminder Email Template                                  */
/*  Agent-facing digest: lists leads with due/overdue follow-ups       */
/* ------------------------------------------------------------------ */

export interface FollowUpItem {
  leadId: string
  leadName: string
  followUpDate: string
  followUpNote: string | null
  status: string
  urgency: "overdue" | "today" | "upcoming"
}

export interface FollowUpReminderEmailData {
  agentName: string
  items: FollowUpItem[]
  appUrl: string
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  overdue: { bg: "#fef2f2", text: "#dc2626", label: "Overdue" },
  today: { bg: "#fffbeb", text: "#d97706", label: "Due Today" },
  upcoming: { bg: "#eff6ff", text: "#2563eb", label: "Upcoming" },
}

function formatFollowUpDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function buildFollowUpReminderEmail(data: FollowUpReminderEmailData): string {
  const { agentName, items, appUrl } = data

  const overdueCount = items.filter((i) => i.urgency === "overdue").length
  const todayCount = items.filter((i) => i.urgency === "today").length

  const subjectHint =
    overdueCount > 0
      ? `${overdueCount} overdue follow-up${overdueCount > 1 ? "s" : ""}`
      : `${todayCount} follow-up${todayCount > 1 ? "s" : ""} due today`

  const rows = items
    .map((item) => {
      const style = URGENCY_STYLES[item.urgency] ?? URGENCY_STYLES.upcoming!
      const noteHtml = item.followUpNote
        ? `<p style="margin: 4px 0 0; font-size: 12px; color: #64748b; font-style: italic;">${item.followUpNote}</p>`
        : ""
      return `
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top;">
                <a href="${appUrl}/leads/${item.leadId}" style="font-size: 14px; font-weight: 600; color: #1773cf; text-decoration: none;">
                  ${item.leadName}
                </a>
                ${noteHtml}
              </td>
              <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background-color: ${style.bg}; color: ${style.text};">
                  ${style.label}
                </span>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
                  ${formatFollowUpDate(item.followUpDate)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Ensurance</h1>
            </td>
          </tr>

          <!-- Greeting + summary -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <p style="margin: 0; font-size: 16px; color: #1e293b; line-height: 1.5;">
                Hi ${agentName},
              </p>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                You have <strong>${subjectHint}</strong> that need${overdueCount > 0 || todayCount > 1 ? "" : "s"} attention. Here&rsquo;s a quick overview:
              </p>
            </td>
          </tr>

          <!-- Follow-up list -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; border-collapse: separate;">
                ${rows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 32px 32px;">
              <a href="${appUrl}/dashboard" style="display: inline-block; padding: 12px 28px; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                Open Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This is an automated reminder from Ensurance. You are receiving this because you have follow-ups scheduled for leads in your pipeline.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
