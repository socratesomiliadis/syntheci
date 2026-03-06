import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectedAccountsFindManyMock: vi.fn(),
  buildIdempotencyKeyMock: vi.fn(),
  upsertJobAuditMock: vi.fn(),
  enqueueJobMock: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  env: {
    GOOGLE_PUBSUB_VERIFICATION_TOKEN: "test-token"
  }
}));

vi.mock("@/lib/idempotency", () => ({
  buildIdempotencyKey: mocks.buildIdempotencyKeyMock
}));

vi.mock("@/lib/jobs-audit", () => ({
  upsertJobAudit: mocks.upsertJobAuditMock
}));

vi.mock("@/lib/queue", () => ({
  enqueueJob: mocks.enqueueJobMock,
  ingestionQueue: { name: "ingestion" }
}));

vi.mock("@syntheci/db", () => ({
  connectedAccounts: {
    provider: "provider"
  },
  db: {
    query: {
      connectedAccounts: {
        findMany: mocks.connectedAccountsFindManyMock
      }
    }
  }
}));

import { POST } from "./route";

describe("POST /api/webhooks/gmail", () => {
  beforeEach(() => {
    mocks.connectedAccountsFindManyMock.mockReset();
    mocks.buildIdempotencyKeyMock.mockReset();
    mocks.upsertJobAuditMock.mockReset();
    mocks.enqueueJobMock.mockReset();
    mocks.buildIdempotencyKeyMock.mockReturnValue("idem-gmail");
    mocks.upsertJobAuditMock.mockResolvedValue(undefined);
    mocks.enqueueJobMock.mockResolvedValue(undefined);
  });

  it("rejects invalid verification token", async () => {
    const request = {
      nextUrl: new URL("http://localhost/api/webhooks/gmail?token=wrong"),
      json: vi.fn().mockResolvedValue({})
    } as never;

    const response = await POST(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid token"
    });
  });

  it("queues ingestion when connected account is matched by email", async () => {
    mocks.connectedAccountsFindManyMock.mockResolvedValue([
      {
        id: "account-1",
        workspaceId: "workspace-1",
        metadata: {
          email: "user@example.com"
        }
      }
    ]);

    const envelope = Buffer.from(
      JSON.stringify({
        emailAddress: "user@example.com",
        historyId: "9999"
      }),
      "utf8"
    ).toString("base64");

    const request = {
      nextUrl: new URL("http://localhost/api/webhooks/gmail?token=test-token"),
      json: vi.fn().mockResolvedValue({
        message: {
          data: envelope,
          messageId: "pubsub-1"
        }
      })
    } as never;

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
    expect(mocks.enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ingest-gmail-notification"
      })
    );
  });
});
