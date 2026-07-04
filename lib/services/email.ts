/**
 * Minimal transactional email via Resend (https://resend.com) — a fetch-only API,
 * no dependency. Active only when RESEND_API_KEY is set; otherwise a graceful
 * no-op (returns false), so nothing breaks before it's configured.
 *
 * To enable: create a Resend account, add + verify your sending domain, then set
 *   RESEND_API_KEY=...            (from the Resend dashboard)
 *   EMAIL_FROM="WhataHotel <alerts@yourdomain.com>"   (a verified sender)
 */
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "WhataHotel <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(RESEND_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!RESEND_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
