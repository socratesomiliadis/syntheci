import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  createCalendarEventMock: vi.fn(),
  isDemoConnectedAccountMock: vi.fn(),
  proposalFindFirstMock: vi.fn(),
  messageFindFirstMock: vi.fn(),
  sourceFindFirstMock: vi.fn(),
  accountFindFirstMock: vi.fn(),
  updateMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
  returningMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@/lib/crypto", () => ({
  decryptSecret: mocks.decryptSecretMock
}));

vi.mock("@/lib/google", () => ({
  createCalendarEvent: mocks.createCalendarEventMock
}));

vi.mock("@/lib/demo", () => ({
  isDemoConnectedAccount: mocks.isDemoConnectedAccountMock
}));

vi.mock("@syntheci/db", () => ({
  meetingProposals: {
    id: "id",
    workspaceId: "workspace_id",
    status: "status",
    externalEventId: "external_event_id"
  },
  messages: {
    id: "id",
    workspaceId: "workspace_id"
  },
  sources: {
    id: "id",
    workspaceId: "workspace_id"
  },
  connectedAccounts: {
    id: "id",
    provider: "provider",
    workspaceId: "workspace_id"
  },
  db: {
    query: {
      meetingProposals: {
        findFirst: mocks.proposalFindFirstMock
      },
      messages: {
        findFirst: mocks.messageFindFirstMock
      },
      sources: {
        findFirst: mocks.sourceFindFirstMock
      },
      connectedAccounts: {
        findFirst: mocks.accountFindFirstMock
      }
    },
    update: mocks.updateMock
  }
}));

import { POST } from "./route";

describe("POST /api/meetings/proposals/[proposalId]/create", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.isDemoConnectedAccountMock.mockReturnValue(false);
    mocks.decryptSecretMock.mockReturnValue("token");
    mocks.createCalendarEventMock.mockResolvedValue({
      id: "event-1"
    });
    mocks.returningMock.mockResolvedValue([
      {
        id: "proposal-1",
        status: "created",
        externalEventId: "event-1"
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

  it("returns 400 when proposal is not approved", async () => {
    mocks.proposalFindFirstMock.mockResolvedValue({
      id: "proposal-1",
      status: "proposed"
    });

    const response = await POST(
      new Request("http://localhost/api/meetings/proposals/proposal-1/create", {
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
      error: "proposal must be approved first"
    });
  });

  it("creates calendar event and updates proposal status", async () => {
    mocks.proposalFindFirstMock.mockResolvedValue({
      id: "proposal-1",
      workspaceId: "workspace-1",
      sourceMessageId: "message-1",
      status: "approved",
      title: "Launch Sync",
      description: "Discuss launch blockers",
      startsAt: new Date("2026-03-09T10:00:00.000Z"),
      endsAt: new Date("2026-03-09T10:30:00.000Z"),
      attendees: ["alex@example.com"],
      timezone: "Europe/Athens"
    });
    mocks.messageFindFirstMock.mockResolvedValue({
      id: "message-1",
      sourceId: "source-1"
    });
    mocks.sourceFindFirstMock.mockResolvedValue({
      id: "source-1",
      connectedAccountId: "account-1"
    });
    mocks.accountFindFirstMock.mockResolvedValue({
      id: "account-1",
      provider: "google",
      accessTokenCiphertext: "cipher-access",
      refreshTokenCiphertext: "cipher-refresh"
    });

    const response = await POST(
      new Request("http://localhost/api/meetings/proposals/proposal-1/create", {
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
      status: "created",
      externalEventId: "event-1"
    });
    expect(mocks.createCalendarEventMock).toHaveBeenCalledTimes(1);
  });

  it("simulates meeting creation for demo connectors", async () => {
    mocks.proposalFindFirstMock.mockResolvedValue({
      id: "proposal-1",
      workspaceId: "workspace-1",
      sourceMessageId: "message-1",
      status: "approved",
      title: "Launch Sync",
      description: "Discuss launch blockers",
      startsAt: new Date("2026-03-09T10:00:00.000Z"),
      endsAt: new Date("2026-03-09T10:30:00.000Z"),
      attendees: ["alex@example.com"],
      timezone: "Europe/Athens"
    });
    mocks.messageFindFirstMock.mockResolvedValue({
      id: "message-1",
      sourceId: "source-1"
    });
    mocks.sourceFindFirstMock.mockResolvedValue({
      id: "source-1",
      connectedAccountId: "account-1"
    });
    mocks.accountFindFirstMock.mockResolvedValue({
      id: "account-1",
      provider: "google",
      metadata: {
        demo: true
      }
    });
    mocks.isDemoConnectedAccountMock.mockReturnValue(true);
    mocks.returningMock.mockResolvedValue([
      {
        id: "proposal-1",
        status: "created",
        externalEventId: "demo-created-proposal-1"
      }
    ]);

    const response = await POST(
      new Request("http://localhost/api/meetings/proposals/proposal-1/create", {
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
      status: "created",
      externalEventId: "demo-created-proposal-1"
    });
    expect(mocks.createCalendarEventMock).not.toHaveBeenCalled();
  });
});
