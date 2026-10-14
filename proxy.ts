import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authorizeBasic } from "@/lib/basic-auth";

/**
 * Basic-auth gate. Off unless `SCOTTY_BASIC_AUTH=user:password` is set, so
 * local dev and tests stay open. `npm run serve` refuses a non-loopback bind
 * until this is set (scripts/bind-guard.mjs).
 */
export function proxy(request: NextRequest) {
  const decision = authorizeBasic(
    request.headers.get("authorization"),
    process.env.SCOTTY_BASIC_AUTH,
  );
  if (decision !== "deny") return NextResponse.next();
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bead Me Up, Scotty"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
