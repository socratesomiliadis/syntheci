import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { connectedAccounts, db } from "@syntheci/db";
import { eq } from "drizzle-orm";

import { upsertConnectedAccount, upsertSource } from "@/lib/connectors";
import { exchangeGoogleCodeForTokens, setupGmailWatch } from "@/lib/google";
import { requireWorkspaceContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const search = request.nextUrl.searchParams;
  const code = search.get("code");
  const state = search.get("state");
  const error = search.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_google_oauth_params", request.url));
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("google_connect_state")?.value;
  cookieStore.delete("google_connect_state");

  if (!stateCookie) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_state_cookie", request.url));
  }

  const [stateWorkspaceId, expectedState] = stateCookie.split(":");
  if (expectedState !== state || stateWorkspaceId !== workspaceId) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", request.url));
  }

  const redirectUri = `${process.env.APP_BASE_URL}/api/connect/google/callback`;
  const { tokens, profile } = await exchangeGoogleCodeForTokens({
    code,
    redirectUri
  });

  if (!tokens.access_token || !profile.id || !profile.email) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_google_tokens", request.url));
  }

  const connectedAccount = await upsertConnectedAccount({
    workspaceId,
    userId: session.user.id,
    provider: "google",
    externalAccountId: profile.id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
    tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    metadata: {
      email: profile.email,
      name: profile.name,
      picture: profile.picture
    }
  });

  await upsertSource({
    workspaceId,
    connectedAccountId: connectedAccount.id,
    type: "gmail",
    externalSourceId: profile.email,
    displayName: `Gmail (${profile.email})`,
    metadata: {
      email: profile.email
    }
  });

  const watch = await setupGmailWatch({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token
  });

  await db
    .update(connectedAccounts)
    .set({
      metadata: {
        ...(connectedAccount.metadata as Record<string, unknown>),
        watchHistoryId: watch.historyId ?? null,
        watchExpiration: watch.expiration ?? null
      },
      updatedAt: new Date()
    })
    .where(eq(connectedAccounts.id, connectedAccount.id));

  return NextResponse.redirect(new URL("/dashboard?connected=google", request.url));
}
