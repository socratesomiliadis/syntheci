import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  upsertSourceMock: vi.fn(),
  buildIdempotencyKeyMock: vi.fn(),
  upsertJobAuditMock: vi.fn(),
  enqueueJobMock: vi.fn(),
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
  returningMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@/lib/connectors", () => ({
  upsertSource: mocks.upsertSourceMock
}));

vi.mock("@/lib/idempotency", () => ({
  buildIdempotencyKey: mocks.buildIdempotencyKeyMock
}));

vi.mock("@/lib/jobs-audit", () => ({
  upsertJobAudit: mocks.upsertJobAuditMock
}));

vi.mock("@/lib/queue", () => ({
  enqueueJob: mocks.enqueueJobMock,
  processingQueue: { name: "processing" }
}));

vi.mock("@syntheci/db", () => ({
  documents: {
    id: "id"
  },
  db: {
    insert: mocks.insertMock
  }
}));

import { POST } from "./route";

describe("POST /api/links", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.upsertSourceMock.mockResolvedValue({
      id: "source-link"
    });
    mocks.buildIdempotencyKeyMock.mockReturnValue("idem-link");
    mocks.upsertJobAuditMock.mockResolvedValue(undefined);
    mocks.enqueueJobMock.mockResolvedValue(undefined);
    mocks.returningMock.mockResolvedValue([{ id: "document-1" }]);
    mocks.valuesMock.mockReturnValue({
      returning: mocks.returningMock
    });
    mocks.insertMock.mockReturnValue({
      values: mocks.valuesMock
    });
  });

  it("stores link metadata and enqueues extraction", async () => {
    const request = new Request("http://localhost/api/links", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        url: "https://example.com/article"
      })
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      documentId: "document-1"
    });
    expect(mocks.enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "process-link"
      })
    );
  });
});
