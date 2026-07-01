/**
 * Minimal, dependency-free JWT (HS256) built on the Web Crypto API so it runs in
 * BOTH the Edge middleware and Node route handlers. Signs/verifies session
 * tokens with the `AUTH_SECRET` env var.
 */

const SECRET =
  process.env.AUTH_SECRET ||
  // Dev fallback so the app boots without config. Set AUTH_SECRET in production.
  "dev-insecure-secret-change-me-in-production";

export interface SessionClaims {
  sub: string; // user id
  email: string;
  name: string;
  iat: number;
  exp: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export async function signSession(
  claims: Pick<SessionClaims, "sub" | "email" | "name">,
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionClaims = { ...claims, iat, exp: iat + SESSION_TTL };
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(data) as BufferSource);
  return `${data}.${b64urlEncode(sig)}`;
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(),
      b64urlToBytes(sig) as BufferSource,
      enc.encode(data) as BufferSource,
    );
    if (!ok) return null;
    const claims = JSON.parse(dec.decode(b64urlToBytes(body))) as SessionClaims;
    if (claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "wah_session";
export const SESSION_MAX_AGE = SESSION_TTL;
