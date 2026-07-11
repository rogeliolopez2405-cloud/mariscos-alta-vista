import { NextRequest, NextResponse } from "next/server";

// Demo-only passcode. Set DASHBOARD_PASSCODE in your env before real use.
const PASSCODE = process.env.DASHBOARD_PASSCODE || "mariscos2026";

export async function POST(request: NextRequest) {
  const { passcode } = (await request.json()) as { passcode: string };

  if (passcode !== PASSCODE) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("dashboard_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("dashboard_auth");
  return response;
}
