import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifySlackSignatureMock: vi.fn(),
  sourceFindFirstMock: vi.fn(),
  buildIdempotencyKeyMock: vi.fn(),
  upsertJobAuditMock: vi.fn(),
  enqueueJobMock: vi.fn()
}));

vi.mock("@/lib/slack", () => ({
  verifySlackSignature: mocks.verifySlackSignatureMock
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
  sources: {
    type: "type",
    externalSourceId: "external_source_id"
  },
  db: {
    query: {
      sources: {
        findFirst: mocks.sourceFindFirstMock
      }
    }
  }
}));

import { POST } from "./route";

describe("POST /api/webhooks/slack/events", () => {
  beforeEach(() => {
    mocks.verifySlackSignatureMock.mockReset();
    mocks.sourceFindFirstMock.mockReset();
    mocks.buildIdempotencyKeyMock.mockReset();
    mocks.upsertJobAuditMock.mockReset();
    mocks.enqueueJobMock.mockReset();
    mocks.buildIdempotencyKeyMock.mockReturnValue("idem-slack");
    mocks.upsertJobAuditMock.mockResolvedValue(undefined);
    mocks.enqueueJobMock.mockResolvedValue(undefined);
  });

  it("rejects invalid signatures", async () => {
    mocks.verifySlackSignatureMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/webhooks/slack/events", {
        method: "POST",
        headers: {
          "x-slack-request-timestamp": "1700000000",
          "x-slack-signature": "v0=bad"
        },
        body: JSON.stringify({
          type: "event_callback"
        })
      }) as never
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid signature"
    });
  });

  it("queues valid event callbacks for known teams", async () => {
    mocks.verifySlackSignatureMock.mockReturnValue(true);
    mocks.sourceFindFirstMock.mockResolvedValue({
      id: "source-1",
      workspaceId: "workspace-1"
    });

    const response = await POST(
      new Request("http://localhost/api/webhooks/slack/events", {
        method: "POST",
        headers: {
          "x-slack-request-timestamp": "1700000000",
          "x-slack-signature": "v0=good"
        },
        body: JSON.stringify({
          type: "event_callback",
          event_id: "evt-1",
          team_id: "team-1",
          event: {
            type: "message",
            text: "hello"
          }
        })
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
    expect(mocks.enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ingest-slack-event"
      })
    );
  });
});
