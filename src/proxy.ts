import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie present). Real verification happens in requireUser().
export function proxy(request: NextRequest) {
  if (!request.cookies.has("wedding_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
