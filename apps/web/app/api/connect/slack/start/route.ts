import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildSlackConnectUrl, createSlackStateToken } from "@/lib/slack";
import { requireWorkspaceContext } from "@/lib/session";

export async function GET() {
  const { workspaceId } = await requireWorkspaceContext();
  const state = createSlackStateToken();
  const cookieStore = await cookies();
  cookieStore.set("slack_connect_state", `${workspaceId}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  return NextResponse.redirect(buildSlackConnectUrl(state));
}
