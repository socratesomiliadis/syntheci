import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  listChatConversationsMock: vi.fn(),
  createChatConversationMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@/lib/chat", () => ({
  listChatConversations: mocks.listChatConversationsMock,
  createChatConversation: mocks.createChatConversationMock
}));

import { GET, POST } from "./route";

describe("chat conversation collection route", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1",
      session: {
        user: {
          id: "user-1"
        }
      }
    });
  });

  it("lists conversations for the current user", async () => {
    mocks.listChatConversationsMock.mockResolvedValue([
      {
        id: "conversation-1",
        title: "Thread",
        createdAt: "2026-03-11T10:00:00.000Z",
        updatedAt: "2026-03-11T10:01:00.000Z",
        latestMessageAt: null,
        preview: null
      }
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      conversations: [
        expect.objectContaining({
          id: "conversation-1",
          title: "Thread"
        })
      ]
    });
    expect(mocks.listChatConversationsMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      userId: "user-1"
    });
  });

  it("creates a new conversation", async () => {
    mocks.createChatConversationMock.mockResolvedValue({
      id: "conversation-1",
      title: "New chat",
      createdAt: "2026-03-11T10:00:00.000Z",
      updatedAt: "2026-03-11T10:00:00.000Z",
      latestMessageAt: null,
      preview: null
    });

    const response = await POST(
      new Request("http://localhost/api/chat/conversations", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "conversation-1",
        title: "New chat"
      })
    );
    expect(mocks.createChatConversationMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      userId: "user-1",
      title: undefined
    });
  });
});
