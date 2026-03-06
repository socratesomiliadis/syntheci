import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildGoogleConnectUrl, createGoogleStateToken } from "@/lib/google";
import { requireWorkspaceContext } from "@/lib/session";

export async function GET() {
  const { workspaceId } = await requireWorkspaceContext();
  const state = createGoogleStateToken();
  const cookieStore = await cookies();

  cookieStore.set("google_connect_state", `${workspaceId}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  const redirectUri = `${process.env.APP_BASE_URL}/api/connect/google/callback`;
  const url = buildGoogleConnectUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
