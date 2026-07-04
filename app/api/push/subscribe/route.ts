import { getCurrentUser } from "@/lib/auth/session";
import {
  pushConfigured,
  vapidPublicKey,
  savePushSubscription,
  removePushSubscription,
} from "@/lib/services/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "info@lorrainetravel.com").toLowerCase();

async function requireAdmin() {
  const me = await getCurrentUser();
  return me && me.email.toLowerCase() === ADMIN_EMAIL ? me : null;
}

/** Client asks whether push is available + the public key needed to subscribe. */
export async function GET() {
  if (!(await requireAdmin())) return Response.json({ configured: false }, { status: 403 });
  return Response.json({ configured: pushConfigured(), publicKey: vapidPublicKey() });
}

/** Store this browser's push subscription so it receives live-agent alerts. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "forbidden" }, { status: 403 });
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint) return Response.json({ error: "invalid subscription" }, { status: 400 });
  await savePushSubscription(sub);
  return Response.json({ ok: true });
}

/** Unsubscribe this browser. */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body?.endpoint) return Response.json({ error: "missing endpoint" }, { status: 400 });
  await removePushSubscription(String(body.endpoint));
  return Response.json({ ok: true });
}
