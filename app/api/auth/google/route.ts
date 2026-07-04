export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

/**
 * Reports whether Google sign-in is configured and, if so, the consent URL the
 * client should send the user to. Inactive (configured:false) until
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set — then it just works.
 */
export async function GET(req: Request) {
  if (!CLIENT_ID) return Response.json({ configured: false });

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return Response.json({
    configured: true,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });
}
