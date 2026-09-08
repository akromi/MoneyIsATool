import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  betaCookieMaxAge, betaCookieName, betaPage, betaPassword, betaToken, sameToken,
} from "@/lib/beta";

export async function middleware(request: NextRequest) {
  const password = betaPassword();
  if (password) {
    const expected = await betaToken(password);
    const held = request.cookies.get(betaCookieName)?.value;
    const admitted = !!held && sameToken(held, expected);

    if (!admitted) {
      // A submitted password lets the visitor straight through to whatever
      // they were originally asking for, query string and all, so sign-in
      // links from email still work through the gate.
      if (request.method === "POST") {
        const form = await request.formData().catch(() => null);
        const given = String(form?.get("beta_password") ?? "");
        if (given && sameToken(await betaToken(given), expected)) {
          const onward = NextResponse.redirect(request.url, 303);
          onward.cookies.set(betaCookieName, expected, {
            httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: betaCookieMaxAge,
          });
          return onward;
        }
        return new NextResponse(betaPage(true), {
          status: 401, headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new NextResponse(betaPage(false), {
        status: 401, headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  }

  return updateSession(request);
}

export const config = {
  // Everything except static assets and the Stripe webhook, which must reach
  // the route untouched — and which therefore stays reachable while the beta
  // gate is up, so purchases keep being recorded.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
