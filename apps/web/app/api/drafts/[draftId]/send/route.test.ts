import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  sendGmailReplyMock: vi.fn(),
  isDemoConnectedAccountMock: vi.fn(),
  draftFindFirstMock: vi.fn(),
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
  sendGmailReply: mocks.sendGmailReplyMock
}));

vi.mock("@/lib/demo", () => ({
  isDemoConnectedAccount: mocks.isDemoConnectedAccountMock
}));

vi.mock("@syntheci/db", () => ({
  draftReplies: {
    id: "id",
    workspaceId: "workspace_id",
    status: "status"
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
      draftReplies: {
        findFirst: mocks.draftFindFirstMock
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

describe("POST /api/drafts/[draftId]/send", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.isDemoConnectedAccountMock.mockReturnValue(false);
    mocks.decryptSecretMock.mockReturnValue("token");
    mocks.sendGmailReplyMock.mockResolvedValue(undefined);
    mocks.returningMock.mockResolvedValue([
      {
        id: "draft-1",
        status: "sent"
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

  it("simulates send for demo connectors", async () => {
    mocks.draftFindFirstMock.mockResolvedValue({
      id: "draft-1",
      messageId: "message-1",
      status: "approved",
      body: "Reply body"
    });
    mocks.messageFindFirstMock.mockResolvedValue({
      id: "message-1",
      sourceId: "source-1",
      senderEmail: "alex@example.com",
      subject: "Subject"
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

    const response = await POST(
      new Request("http://localhost/api/drafts/draft-1/send", {
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
      status: "sent"
    });
    expect(mocks.sendGmailReplyMock).not.toHaveBeenCalled();
  });
});
