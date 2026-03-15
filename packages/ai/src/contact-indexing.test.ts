import { afterEach, describe, expect, it, vi } from "vitest";

import { buildContactExternalUrl } from "./contact-indexing";

describe("buildContactExternalUrl", () => {
  const envSnapshot = {
    APP_BASE_URL: process.env.APP_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL
  };

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.APP_BASE_URL = envSnapshot.APP_BASE_URL;
    process.env.NEXT_PUBLIC_APP_URL = envSnapshot.NEXT_PUBLIC_APP_URL;
    process.env.BETTER_AUTH_URL = envSnapshot.BETTER_AUTH_URL;
  });

  it("builds an absolute dashboard URL from the configured app base URL", () => {
    process.env.APP_BASE_URL = "https://syntheci.example";

    expect(buildContactExternalUrl("contact-123")).toBe(
      "https://syntheci.example/dashboard/contacts?contact=contact-123"
    );
  });

  it("falls back to localhost when no app URL is configured", () => {
    delete process.env.APP_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.BETTER_AUTH_URL;

    expect(buildContactExternalUrl("contact-456")).toBe(
      "http://localhost:3000/dashboard/contacts?contact=contact-456"
    );
  });
});
