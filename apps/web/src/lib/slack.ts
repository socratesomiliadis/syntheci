import crypto from "node:crypto";

import { env } from "./env";

export const slackScopes = [
  "channels:history",
  "groups:history",
  "im:history",
  "users:read",
  "chat:write"
];

export function createSlackStateToken() {
  return crypto.randomBytes(20).toString("hex");
}

export function buildSlackConnectUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: slackScopes.join(","),
    redirect_uri: env.SLACK_REDIRECT_URI,
    state
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_REDIRECT_URI
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Slack OAuth failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    ok: boolean;
    access_token?: string;
    team?: { id: string; name: string };
    authed_user?: { id: string };
    error?: string;
    scope?: string;
    bot_user_id?: string;
  };

  if (!payload.ok || !payload.access_token || !payload.team?.id) {
    throw new Error(payload.error ?? "Slack OAuth payload invalid");
  }

  return payload;
}

export function verifySlackSignature(rawBody: string, timestamp: string, signature: string) {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts < fiveMinutesAgo) {
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto
    .createHmac("sha256", env.SLACK_SIGNING_SECRET)
    .update(base)
    .digest("hex");
  const expected = `v0=${hmac}`;

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
