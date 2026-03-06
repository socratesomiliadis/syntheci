import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { upsertConnectedAccount, upsertSource } from "@/lib/connectors";
import { exchangeSlackCodeForToken } from "@/lib/slack";
import { requireWorkspaceContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { workspaceId, session } = await requireWorkspaceContext();
  const search = request.nextUrl.searchParams;
  const code = search.get("code");
  const state = search.get("state");
  const error = search.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_slack_oauth_params", request.url));
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("slack_connect_state")?.value;
  cookieStore.delete("slack_connect_state");
  if (!stateCookie) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_state_cookie", request.url));
  }

  const [stateWorkspaceId, expectedState] = stateCookie.split(":");
  if (expectedState !== state || stateWorkspaceId !== workspaceId) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", request.url));
  }

  const token = await exchangeSlackCodeForToken(code);

  const connectedAccount = await upsertConnectedAccount({
    workspaceId,
    userId: session.user.id,
    provider: "slack",
    externalAccountId: token.team?.id ?? token.authed_user?.id ?? "slack-team",
    accessToken: token.access_token ?? "",
    refreshToken: null,
    scopes: (token.scope ?? "").split(",").filter(Boolean),
    tokenExpiresAt: null,
    metadata: {
      team: token.team,
      botUserId: token.bot_user_id,
      authedUser: token.authed_user
    }
  });

  await upsertSource({
    workspaceId,
    connectedAccountId: connectedAccount.id,
    type: "slack",
    externalSourceId: token.team?.id ?? null,
    displayName: `Slack (${token.team?.name ?? token.team?.id ?? "workspace"})`,
    metadata: {
      team: token.team,
      authedUser: token.authed_user
    }
  });

  return NextResponse.redirect(new URL("/dashboard?connected=slack", request.url));
}
