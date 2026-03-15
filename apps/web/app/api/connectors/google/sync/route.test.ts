import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  connectedAccountsFindManyMock: vi.fn(),
  isDemoConnectedAccountMock: vi.fn(),
  importNextDemoSyncBatchMock: vi.fn(),
  buildIdempotencyKeyMock: vi.fn(),
  upsertJobAuditMock: vi.fn(),
  enqueueJobMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@/lib/idempotency", () => ({
  buildIdempotencyKey: mocks.buildIdempotencyKeyMock
}));

vi.mock("@/lib/demo", () => ({
  isDemoConnectedAccount: mocks.isDemoConnectedAccountMock,
  importNextDemoSyncBatch: mocks.importNextDemoSyncBatchMock
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
    workspaceId: "workspace_id"
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

describe("POST /api/connectors/google/sync", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.connectedAccountsFindManyMock.mockReset();
    mocks.buildIdempotencyKeyMock.mockReset();
    mocks.upsertJobAuditMock.mockReset();
    mocks.enqueueJobMock.mockReset();
    mocks.isDemoConnectedAccountMock.mockReset();
    mocks.importNextDemoSyncBatchMock.mockReset();
    mocks.buildIdempotencyKeyMock.mockReturnValue("idem-sync");
    mocks.upsertJobAuditMock.mockResolvedValue(undefined);
    mocks.enqueueJobMock.mockResolvedValue(undefined);
    mocks.isDemoConnectedAccountMock.mockReturnValue(false);
    mocks.importNextDemoSyncBatchMock.mockResolvedValue({
      batchId: "demo-batch-followups",
      importedCount: 1
    });
  });

  it("returns 404 when there is no Google connector", async () => {
    mocks.connectedAccountsFindManyMock.mockResolvedValue([]);

    const response = await POST();
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "google connector not found"
    });
  });

  it("queues Gmail sync jobs for Google accounts in the workspace", async () => {
    mocks.connectedAccountsFindManyMock.mockResolvedValue([
      {
        id: "account-1",
        provider: "google"
      }
    ]);

    const response = await POST();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      queued: 1,
      imported: 0,
      batchId: null
    });
    expect(mocks.upsertJobAuditMock).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "sync-gmail-account"
      })
    );
  });

  it("imports a demo fixture batch instead of queueing a real sync job", async () => {
    mocks.connectedAccountsFindManyMock.mockResolvedValue([
      {
        id: "account-1",
        provider: "google",
        metadata: {
          demo: true
        }
      }
    ]);
    mocks.isDemoConnectedAccountMock.mockReturnValue(true);

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      queued: 0,
      imported: 1,
      batchId: "demo-batch-followups"
    });
    expect(mocks.importNextDemoSyncBatchMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      connectedAccountId: "account-1"
    });
    expect(mocks.enqueueJobMock).not.toHaveBeenCalled();
  });
});
