import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const jwtSecretValue =
  process.env.JWT_SECRET || "axiora_build_time_jwt_secret_placeholder_min32chars";
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);

const COOKIE_NAME = "moon_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and internal Next.js assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  let userPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
      userPayload = payload;
    } catch {
      // Token invalid or expired — clear it
      isAuthenticated = false;
    }
  }

  // Redirect authenticated users away from login
  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Block unauthenticated access to protected routes
  if (!isPublic && !isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only route guard for /admin
  if (pathname.startsWith("/admin") && userPayload?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Admin-only API guard for /api/admin/*
  if (pathname.startsWith("/api/admin") && userPayload?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  const response = NextResponse.next();
  if (userPayload) {
    response.headers.set("x-user-id", userPayload.id || "");
    response.headers.set("x-user-role", userPayload.role || "");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
