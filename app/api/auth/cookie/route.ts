import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "log0_refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// POST /api/auth/cookie - store refresh token in httpOnly cookie
export async function POST(request: Request) {
  const { refreshToken } = await request.json();

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Missing refreshToken" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

  return NextResponse.json({ ok: true });
}

// DELETE /api/auth/cookie - clear the cookie on logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
