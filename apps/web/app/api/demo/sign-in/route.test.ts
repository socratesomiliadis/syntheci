import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInEmailMock: vi.fn()
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signInEmail: mocks.signInEmailMock
    }
  }
}));

vi.mock("@/lib/env", () => ({
  env: {
    DEMO_MODE_ENABLED: true,
    DEMO_ACCOUNT_EMAIL: "demo@syntheci.local",
    DEMO_ACCOUNT_PASSWORD: "demo-password-123"
  }
}));

import { POST } from "./route";

describe("POST /api/demo/sign-in", () => {
  beforeEach(() => {
    mocks.signInEmailMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "session=value"
        }
      })
    );
  });

  it("signs into the seeded demo account", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.signInEmailMock).toHaveBeenCalledWith({
      asResponse: true,
      body: {
        email: "demo@syntheci.local",
        password: "demo-password-123",
        callbackURL: "/dashboard",
        rememberMe: true
      }
    });
  });

  it("returns a helpful bootstrap error when the demo account has not been seeded", async () => {
    mocks.signInEmailMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const response = await POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error:
        "The demo account has not been bootstrapped yet. Start the bootstrap service or rerun `pnpm compose:dev`."
    });
  });
});
