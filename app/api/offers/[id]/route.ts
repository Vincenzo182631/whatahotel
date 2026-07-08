import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOffer, markOfferViewed, markOfferSent, advisorLabel } from "@/lib/services/offers";
import { sendEmail, emailConfigured } from "@/lib/services/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

type Ctx = { params: Promise<{ id: string }> };

/** Public: fetch an offer (also records the guest view — but not the agent's own). */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  const me = await getCurrentUser();
  const isAgent = me && me.email.toLowerCase() === ADMIN_EMAIL;
  if (!isAgent) await markOfferViewed(id);
  return NextResponse.json({ offer });
}

/** Agent: email the offer link to the guest and mark it sent. */
export async function POST(req: Request, { params }: Ctx) {
  const me = await getCurrentUser();
  if (!me || me.email.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (!offer.guestEmails?.length) {
    return NextResponse.json({ error: "This offer has no recipient email." }, { status: 400 });
  }
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email isn't configured yet — use Copy link for now, or add RESEND_API_KEY." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const link = `${origin}/offer/${offer.id}`;
  const advisor = advisorLabel(offer.agentName);
  const hi = offer.guestName ? `Hi ${offer.guestName},` : "Hello,";
  const note = offer.note
    ? `<p style="white-space:pre-wrap;color:#333;margin:0 0 16px">${escapeHtml(offer.note)}</p>`
    : "";

  const sent = await sendEmail({
    to: offer.guestEmails,
    subject: `Your ${offer.city} hotel options from WhataHotel`,
    html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <p style="font-size:15px;margin:0 0 14px">${hi}</p>
        <p style="font-size:15px;margin:0 0 16px">${escapeHtml(advisor)} has prepared a personalised comparison of hotels in <strong>${escapeHtml(offer.city)}</strong> for your dates. Open it to see live rates, room options and advisor perks side by side — and ask our AI advisor any questions.</p>
        ${note}
        <p style="margin:20px 0"><a href="${link}" style="display:inline-block;background:#FF385C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px">View your options →</a></p>
        <p style="font-size:13px;color:#888;margin:0 0 4px">Rates shown are live for your dates and can change as your trip nears.</p>
        <p style="font-size:13px;color:#888;margin:0">Or open: ${link}</p>
      </div>`,
    text: `${hi}\n\n${advisor} prepared a comparison of hotels in ${offer.city} for your dates.${offer.note ? `\n\n${offer.note}` : ""}\n\nView your options: ${link}\n\nRates are live for your dates and can change as your trip nears.`,
  });

  if (!sent.ok) {
    const raw = sent.error || "";
    // Resend's most common setup snag: on an unverified account it only delivers
    // to the account's own signup email. Translate the raw API error into a clear,
    // actionable message instead of dumping the technical string on the agent.
    const testMode = /only send testing emails|verify a domain/i.test(raw);
    const message = testMode
      ? "Resend is still in test mode — it can only email your own Resend account address until you verify a sending domain. To email real guests, verify your domain at resend.com/domains and set EMAIL_FROM to an address on it. (For now, Copy the link and send it yourself.)"
      : raw
        ? `Couldn't send: ${raw}`
        : "Couldn't send the email — try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  const updated = await markOfferSent(id);
  return NextResponse.json({ ok: true, offer: updated });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
