import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { env } from "./env";
import { buildSlackConnectUrl, verifySlackSignature } from "./slack";

describe("slack helpers", () => {
  it("builds oauth URL with required params", () => {
    const state = "state-token";
    const url = new URL(buildSlackConnectUrl(state));

    expect(url.origin).toBe("https://slack.com");
    expect(url.pathname).toBe("/oauth/v2/authorize");
    expect(url.searchParams.get("state")).toBe(state);
    expect(url.searchParams.get("client_id")).toBe(env.SLACK_CLIENT_ID);
  });

  it("verifies correct signature", () => {
    const body = JSON.stringify({ type: "event_callback" });
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const base = `v0:${timestamp}:${body}`;
    const signature = `v0=${crypto
      .createHmac("sha256", env.SLACK_SIGNING_SECRET)
      .update(base)
      .digest("hex")}`;

    expect(verifySlackSignature(body, timestamp, signature)).toBe(true);
  });

  it("rejects stale timestamps", () => {
    const body = "{}";
    const oldTimestamp = `${Math.floor(Date.now() / 1000) - 60 * 10}`;
    expect(verifySlackSignature(body, oldTimestamp, "v0=whatever")).toBe(false);
  });
});
