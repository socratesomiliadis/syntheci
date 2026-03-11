import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { JOB_NAMES, QUEUE_NAMES } from "@syntheci/shared";

import { upsertConnectedAccount, upsertSource } from "@/lib/connectors";
import { exchangeGoogleCodeForTokens } from "@/lib/google";
import { buildIdempotencyKey } from "@/lib/idempotency";
import { upsertJobAudit } from "@/lib/jobs-audit";
import { enqueueJob, ingestionQueue } from "@/lib/queue";
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

  const idempotencyKey = buildIdempotencyKey(
    "gmail-connect-sync",
    workspaceId,
    connectedAccount.id,
    Date.now()
  );

  await upsertJobAudit({
    workspaceId,
    queueName: QUEUE_NAMES.ingestion,
    jobName: JOB_NAMES.SYNC_GMAIL_ACCOUNT,
    idempotencyKey,
    payload: {
      connectedAccountId: connectedAccount.id,
      reason: "initial_connect"
    },
    status: "queued"
  });

  await enqueueJob({
    queue: ingestionQueue,
    name: JOB_NAMES.SYNC_GMAIL_ACCOUNT,
    payload: {
      workspaceId,
      connectedAccountId: connectedAccount.id,
      idempotencyKey,
      reason: "initial_connect"
    }
  });

  return NextResponse.redirect(new URL("/dashboard?connected=google", request.url));
}
