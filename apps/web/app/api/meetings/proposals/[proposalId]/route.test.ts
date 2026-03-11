import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  proposalFindFirstMock: vi.fn(),
  updateMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
  returningMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@syntheci/db", () => ({
  meetingProposals: {
    id: "id",
    workspaceId: "workspace_id",
    status: "status",
    startsAt: "starts_at",
    endsAt: "ends_at"
  },
  db: {
    query: {
      meetingProposals: {
        findFirst: mocks.proposalFindFirstMock
      }
    },
    update: mocks.updateMock
  }
}));

import { PATCH } from "./route";

describe("PATCH /api/meetings/proposals/[proposalId]", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.returningMock.mockResolvedValue([
      {
        id: "proposal-1",
        status: "approved",
        startsAt: new Date("2026-03-09T10:00:00.000Z"),
        endsAt: new Date("2026-03-09T10:30:00.000Z")
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

  it("rejects edits after event creation", async () => {
    mocks.proposalFindFirstMock.mockResolvedValue({
      id: "proposal-1",
      status: "created"
    });

    const response = await PATCH(
      new Request("http://localhost/api/meetings/proposals/proposal-1", {
        method: "PATCH",
        body: JSON.stringify({
          startsAt: "2026-03-09T10:00:00.000Z",
          endsAt: "2026-03-09T10:30:00.000Z"
        })
      }) as never,
      {
        params: Promise.resolve({
          proposalId: "proposal-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "cannot edit timing after calendar event creation"
    });
  });

  it("updates proposal timing", async () => {
    mocks.proposalFindFirstMock.mockResolvedValue({
      id: "proposal-1",
      status: "approved"
    });

    const response = await PATCH(
      new Request("http://localhost/api/meetings/proposals/proposal-1", {
        method: "PATCH",
        body: JSON.stringify({
          startsAt: "2026-03-09T10:00:00.000Z",
          endsAt: "2026-03-09T10:30:00.000Z"
        })
      }) as never,
      {
        params: Promise.resolve({
          proposalId: "proposal-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "proposal-1",
      status: "approved",
      startsAt: "2026-03-09T10:00:00.000Z",
      endsAt: "2026-03-09T10:30:00.000Z"
    });
  });
});
