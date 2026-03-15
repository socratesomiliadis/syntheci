import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  upsertSourceMock: vi.fn(),
  buildIdempotencyKeyMock: vi.fn(),
  upsertJobAuditMock: vi.fn(),
  enqueueJobMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  valuesMock: vi.fn(),
  returningMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
  updateReturningMock: vi.fn()
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

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq-clause")
}));

vi.mock("@syntheci/db", () => ({
  documents: {
    id: "id"
  },
  db: {
    insert: mocks.insertMock,
    update: mocks.updateMock
  }
}));

import { POST } from "./route";

describe("POST /api/notes", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.upsertSourceMock.mockResolvedValue({
      id: "source-note"
    });
    mocks.buildIdempotencyKeyMock.mockReturnValue("idem-note");
    mocks.upsertJobAuditMock.mockResolvedValue(undefined);
    mocks.enqueueJobMock.mockResolvedValue(undefined);
    mocks.returningMock.mockResolvedValue([{ id: "document-1" }]);
    mocks.updateReturningMock.mockResolvedValue([{ id: "document-1" }]);
    mocks.valuesMock.mockReturnValue({
      returning: mocks.returningMock
    });
    mocks.insertMock.mockReturnValue({
      values: mocks.valuesMock
    });
    mocks.whereMock.mockReturnValue({
      returning: mocks.updateReturningMock
    });
    mocks.setMock.mockReturnValue({
      where: mocks.whereMock
    });
    mocks.updateMock.mockReturnValue({
      set: mocks.setMock
    });
  });

  it("creates a note and enqueues processing", async () => {
    const request = new Request("http://localhost/api/notes", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        title: "Weekly notes",
        body: "Action items"
      })
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      documentId: "document-1"
    });
    expect(mocks.upsertSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        type: "note"
      })
    );
    expect(mocks.upsertJobAuditMock).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "process-note"
      })
    );
  });
});
