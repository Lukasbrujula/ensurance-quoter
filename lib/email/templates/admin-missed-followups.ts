import { escapeHtml } from "@/lib/email/escape-html"

/* ------------------------------------------------------------------ */
/*  Admin Missed Follow-ups Email Template                             */
/*  Sent to org admins when agents have unactioned follow-ups          */
/* ------------------------------------------------------------------ */

export interface MissedFollowUpAgent {
  agentName: string
  leads: {
    leadId: string
    leadName: string
    followUpDate: string
  }[]
}

export interface AdminMissedFollowUpsEmailData {
  adminName: string
  agents: MissedFollowUpAgent[]
  totalCount: number
  appUrl: string
}

function formatFollowUpDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function buildAdminMissedFollowUpsEmail(
  data: AdminMissedFollowUpsEmailData,
): string {
  const { adminName, agents, totalCount, appUrl } = data

  const agentSections = agents
    .map((agent) => {
      const leadRows = agent.leads
        .map(
          (lead) => `
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: top;">
                  <a href="${escapeHtml(appUrl)}/leads/${escapeHtml(lead.leadId)}" style="font-size: 13px; font-weight: 600; color: #1773cf; text-decoration: none;">
                    ${escapeHtml(lead.leadName)}
                  </a>
                </td>
                <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background-color: #fef2f2; color: #dc2626;">
                    Due ${formatFollowUpDate(lead.followUpDate)}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`,
        )
        .join("")

      return `
      <tr>
        <td style="padding: 16px 16px 8px;">
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">
            ${escapeHtml(agent.agentName)} <span style="font-weight: 400; color: #94a3b8;">&mdash; ${agent.leads.length} missed</span>
          </p>
        </td>
      </tr>
      ${leadRows}`
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

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <p style="margin: 0; font-size: 16px; color: #1e293b; line-height: 1.5;">
                Hi ${escapeHtml(adminName)},
              </p>
              <p style="margin: 12px 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Your team has <strong>${totalCount} missed follow-up${totalCount === 1 ? "" : "s"}</strong> &mdash; leads where the scheduled follow-up date passed with no logged activity.
              </p>
            </td>
          </tr>

          <!-- Agent sections -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 6px; border-collapse: separate;">
                ${agentSections}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 32px 32px;">
              <a href="${escapeHtml(appUrl)}/agency" style="display: inline-block; padding: 12px 28px; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                View Agency Overview
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This is an automated alert from Ensurance. You are receiving this because you are an admin with team members who have overdue follow-ups.
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
