import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  getChatConversationMock: vi.fn(),
  renameChatConversationMock: vi.fn(),
  deleteChatConversationMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@/lib/chat", () => ({
  getChatConversation: mocks.getChatConversationMock,
  renameChatConversation: mocks.renameChatConversationMock,
  deleteChatConversation: mocks.deleteChatConversationMock
}));

import { DELETE, GET, PATCH } from "./route";

describe("chat conversation detail route", () => {
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

  it("returns 404 when the conversation is not found", async () => {
    mocks.getChatConversationMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ conversationId: "conversation-1" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "conversation not found"
    });
  });

  it("renames a conversation", async () => {
    mocks.renameChatConversationMock.mockResolvedValue({
      id: "conversation-1",
      title: "Renamed thread",
      createdAt: "2026-03-11T10:00:00.000Z",
      updatedAt: "2026-03-11T10:02:00.000Z",
      latestMessageAt: "2026-03-11T10:01:00.000Z",
      preview: "Latest reply"
    });

    const response = await PATCH(
      new Request("http://localhost/api/chat/conversations/conversation-1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Renamed thread"
        })
      }) as never,
      {
        params: Promise.resolve({ conversationId: "conversation-1" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: "conversation-1",
        title: "Renamed thread"
      })
    );
  });

  it("deletes a conversation", async () => {
    mocks.deleteChatConversationMock.mockResolvedValue(true);

    const response = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ conversationId: "conversation-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });
});
