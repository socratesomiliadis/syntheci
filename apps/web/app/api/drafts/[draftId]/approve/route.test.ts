import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  draftFindFirstMock: vi.fn(),
  updateMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
  returningMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@syntheci/db", () => ({
  draftReplies: {
    id: "id",
    workspaceId: "workspace_id",
    status: "status"
  },
  db: {
    query: {
      draftReplies: {
        findFirst: mocks.draftFindFirstMock
      }
    },
    update: mocks.updateMock
  }
}));

import { POST } from "./route";

describe("POST /api/drafts/[draftId]/approve", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.returningMock.mockResolvedValue([
      {
        id: "draft-1",
        status: "approved"
      }
    ]);
    mocks.whereMock.mockReturnValue({
      returning: mocks.returningMock
    });
    mocks.setMock.mockReturnValue({
      where: mocks.whereMock
    });
    mocks.updateMock.mockReturnValue({
      set: mocks.setMock
    });
  });

  it("returns 400 when draft is not in generated status", async () => {
    mocks.draftFindFirstMock.mockResolvedValue({
      id: "draft-1",
      status: "approved"
    });

    const response = await POST(
      new Request("http://localhost/api/drafts/draft-1/approve", {
        method: "POST"
      }) as never,
      {
        params: Promise.resolve({
          draftId: "draft-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "draft must be generated before approval"
    });
  });

  it("approves generated draft", async () => {
    mocks.draftFindFirstMock.mockResolvedValue({
      id: "draft-1",
      status: "generated"
    });

    const response = await POST(
      new Request("http://localhost/api/drafts/draft-1/approve", {
        method: "POST"
      }) as never,
      {
        params: Promise.resolve({
          draftId: "draft-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "draft-1",
      status: "approved"
    });
  });
});
