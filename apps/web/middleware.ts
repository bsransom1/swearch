import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAppRoute =
    pathname.startsWith("/projects") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/highlights") ||
    pathname.startsWith("/papers") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/activity");

  if (isAppRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // `privacy` is excluded so the public policy page never depends on an auth
  // round-trip (Chrome Web Store reviewers load it while signed out).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback|privacy).*)"],
};
