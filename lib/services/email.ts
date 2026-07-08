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
}): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_KEY) return { ok: false, error: "Email isn't configured — set RESEND_API_KEY." };
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
    if (res.ok) return { ok: true };
    // Surface Resend's real message so setup issues (unverified domain, wrong
    // key, test-only recipient) are obvious instead of a generic failure.
    let detail = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string; error?: string };
      detail = j?.message || j?.error || detail;
    } catch {
      /* keep status */
    }
    console.error("Resend send failed:", res.status, detail);
    return { ok: false, error: detail };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "network error" };
  }
}
