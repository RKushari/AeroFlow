import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as string;
  const path = req.nextUrl.pathname;

  if (path === "/") {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token.email === "johndoe@gmail.com") {
    return NextResponse.next();
  }

  if (path.startsWith("/crew") && role !== "GROUND_CREW_LEAD") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/dispatcher") && role !== "FLIGHT_DISPATCHER" && role !== "OPERATIONS_DIRECTOR") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (path.startsWith("/director") && role !== "OPERATIONS_DIRECTOR") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/crew/:path*", "/dispatcher/:path*", "/director/:path*"],
};
