import crypto from "node:crypto";

import { google } from "googleapis";

import { env } from "./env";

const oauthScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events"
];

export function createGoogleOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);
}

export function createGoogleStateToken() {
  return crypto.randomBytes(20).toString("hex");
}

export function buildGoogleConnectUrl(redirectUri: string, state: string) {
  const client = createGoogleOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: oauthScopes,
    state
  });
}

export async function exchangeGoogleCodeForTokens(input: {
  code: string;
  redirectUri: string;
}) {
  const client = createGoogleOAuthClient(input.redirectUri);
  const { tokens } = await client.getToken(input.code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: client,
    version: "v2"
  });
  const me = await oauth2.userinfo.get();

  return {
    tokens,
    profile: me.data
  };
}

export async function createCalendarEvent(input: {
  accessToken: string;
  refreshToken?: string | null;
  summary: string;
  description?: string | null;
  start: string;
  end: string;
  attendees: string[];
  timezone: string;
}) {
  const client = createGoogleOAuthClient(`${env.APP_BASE_URL}/api/connect/google/callback`);
  client.setCredentials({
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? undefined
  });

  const calendar = google.calendar({
    version: "v3",
    auth: client
  });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      description: input.description ?? undefined,
      start: {
        dateTime: input.start,
        timeZone: input.timezone
      },
      end: {
        dateTime: input.end,
        timeZone: input.timezone
      },
      attendees: input.attendees.map((email) => ({ email }))
    }
  });

  return response.data;
}

export async function listCalendarEvents(input: {
  accessToken: string;
  refreshToken?: string | null;
  timeMin: string;
  timeMax: string;
}) {
  const client = createGoogleOAuthClient(`${env.APP_BASE_URL}/api/connect/google/callback`);
  client.setCredentials({
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? undefined
  });

  const calendar = google.calendar({
    version: "v3",
    auth: client
  });

  const response = await calendar.events.list({
    calendarId: "primary",
    orderBy: "startTime",
    singleEvents: true,
    showDeleted: false,
    maxResults: 250,
    timeMin: input.timeMin,
    timeMax: input.timeMax
  });

  return response.data.items ?? [];
}

export async function sendGmailReply(input: {
  accessToken: string;
  refreshToken?: string | null;
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
}) {
  const client = createGoogleOAuthClient(`${env.APP_BASE_URL}/api/connect/google/callback`);
  client.setCredentials({
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? undefined
  });

  const gmail = google.gmail({
    version: "v1",
    auth: client
  });

  const mime = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body
  ].join("\n");

  const raw = Buffer.from(mime, "utf8").toString("base64url");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: input.threadId ?? undefined
    }
  });

  return response.data;
}
