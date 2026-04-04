import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "log0_refresh_token";

// POST /api/auth/refresh - read httpOnly cookie, call backend, return new access token
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const backendRes = await fetch(
    `${process.env.NEXT_PUBLIC_AUTH_API_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }
  );

  if (!backendRes.ok) {
    // Refresh token is invalid/expired - clear the cookie
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const data = await backendRes.json();

  // Update cookie with the new refresh token
  cookieStore.set(COOKIE_NAME, data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ accessToken: data.accessToken });
}
