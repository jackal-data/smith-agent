/**
 * Email service using Resend.
 * Set RESEND_API_KEY in .env to enable real sending.
 * Without it, emails are logged to console (dev/test mode).
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.MARKETING_FROM_EMAIL || "deals@smithmotors.com";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export interface PriceAlertPayload {
  subject: string;
  message: string;
  vehicle?: {
    year: number;
    make: string;
    model: string;
    trim?: string | null;
    msrp: number;
    salePrice?: number | null;
  };
}

function buildEmailHtml(
  payload: PriceAlertPayload,
  recipientName: string | null,
  unsubscribeUrl: string
): string {
  const { subject, message, vehicle } = payload;
  const greeting = recipientName ? `Hi ${recipientName.split(" ")[0]},` : "Hi there,";

  const vehicleSection = vehicle
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Featured Vehicle</p>
          <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">
            ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              ${
                vehicle.salePrice && vehicle.salePrice < vehicle.msrp
                  ? `
              <td style="padding-right:20px;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">Was</p>
                <p style="margin:0;font-size:16px;color:#94a3b8;text-decoration:line-through;">$${vehicle.msrp.toLocaleString()}</p>
              </td>
              <td>
                <p style="margin:0;font-size:11px;color:#16a34a;font-weight:600;">Now</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a;">$${vehicle.salePrice.toLocaleString()}</p>
              </td>`
                  : `
              <td>
                <p style="margin:0;font-size:11px;color:#64748b;">MSRP</p>
                <p style="margin:0;font-size:22px;font-weight:700;color:#1e40af;">$${vehicle.msrp.toLocaleString()}</p>
              </td>`
              }
            </tr>
          </table>
        </td>
      </tr>
    </table>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;margin-bottom:12px;padding:0 8px;">SM</div>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Smith Motors</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">Exclusive Deal for You</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;">${greeting}</p>
              ${vehicleSection}
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">${message.replace(/\n/g, "<br>")}</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1d4ed8;border-radius:8px;">
                    <a href="${BASE_URL}/customer/inventory"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Browse Inventory →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                You're receiving this because you signed up for deal alerts from Smith Motors.<br>
                <a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPriceAlertEmails(
  subscribers: Array<{
    email: string;
    name: string | null;
    unsubscribeToken: string;
  }>,
  payload: PriceAlertPayload
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const unsubscribeUrl = `${BASE_URL}/api/marketing/unsubscribe?token=${sub.unsubscribeToken}`;
    const html = buildEmailHtml(payload, sub.name, unsubscribeUrl);

    if (!resend) {
      // Dev mode — log instead of sending
      console.log(
        `[email] Would send "${payload.subject}" to ${sub.email}`
      );
      sent++;
      continue;
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: sub.email,
        subject: payload.subject,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`[email] Failed to send to ${sub.email}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}
