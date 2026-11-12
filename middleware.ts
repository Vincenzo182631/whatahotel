import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

/**
 * SEO comparison pages have one canonical URL per pair: /compare/<a>-vs-<b> with
 * the two hotel ids in alphabetical order (see lib/seo/comparisons.ts). A request
 * for the other order gets a real 308 here, before rendering — the page itself
 * streams, so a redirect thrown from it would arrive after a 200.
 *
 * Route protection. Everything under /dashboard requires a valid session cookie;
 * otherwise redirect to /login (preserving the intended destination). Signed-in
 * users are bounced away from /login and /signup.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/compare/")) {
    const parts = pathname.slice("/compare/".length).split("-vs-");
    if (parts.length === 2 && parts[0] && parts[1] && parts[0] > parts[1]) {
      const url = req.nextUrl.clone();
      url.pathname = `/compare/${parts[1]}-vs-${parts[0]}`;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  const isProtected = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !claims) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && claims) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/compare/:path+"],
};
