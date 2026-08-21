import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as string;
    const path = req.nextUrl.pathname;
    
    if (token) {
      // For testing purposes, johndoe@gmail.com can access everything
      if (token.email === "johndoe@gmail.com") {
        return;
      }
      
      // Prevent cross-dashboard access for logged-in users
      if (path.startsWith("/crew") && role !== "GROUND_CREW_LEAD") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      
      if (path.startsWith("/dispatcher") && role !== "FLIGHT_DISPATCHER" && role !== "OPERATIONS_DIRECTOR") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      
      if (path.startsWith("/director") && role !== "OPERATIONS_DIRECTOR") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path === "/") {
          return true; // Let the middleware body handle redirecting if logged in
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/", "/crew/:path*", "/dispatcher/:path*", "/director/:path*"],
};
