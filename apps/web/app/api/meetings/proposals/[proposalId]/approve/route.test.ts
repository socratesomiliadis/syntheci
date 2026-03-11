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
    status: "status"
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

import { POST } from "./route";

describe("POST /api/meetings/proposals/[proposalId]/approve", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.returningMock.mockResolvedValue([
      {
        id: "proposal-1",
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

  it("returns 400 when start/end time is missing", async () => {
    mocks.proposalFindFirstMock.mockResolvedValue({
      id: "proposal-1",
      status: "proposed",
      startsAt: null,
      endsAt: null
    });

    const response = await POST(
      new Request("http://localhost/api/meetings/proposals/proposal-1/approve", {
        method: "POST"
      }) as never,
      {
        params: Promise.resolve({
          proposalId: "proposal-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "proposal missing start/end time; extract or confirm timing first"
    });
  });

  it("approves a schedulable proposal", async () => {
    mocks.proposalFindFirstMock.mockResolvedValue({
      id: "proposal-1",
      status: "proposed",
      startsAt: new Date("2026-03-09T10:00:00.000Z"),
      endsAt: new Date("2026-03-09T10:30:00.000Z")
    });

    const response = await POST(
      new Request("http://localhost/api/meetings/proposals/proposal-1/approve", {
        method: "POST"
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
      status: "approved"
    });
  });
});
