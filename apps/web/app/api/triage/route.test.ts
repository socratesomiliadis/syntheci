import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  classifyMessageTriageMock: vi.fn(),
  messageFindFirstMock: vi.fn(),
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
  onConflictDoUpdateMock: vi.fn(),
  returningMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock
}));

vi.mock("@syntheci/ai", () => ({
  chatModelVersion: "test-model",
  classifyMessageTriage: mocks.classifyMessageTriageMock
}));

vi.mock("@syntheci/db", () => ({
  messages: {
    id: "id",
    workspaceId: "workspace_id"
  },
  triageResults: {
    messageId: "message_id",
    label: "label",
    confidence: "confidence",
    rationale: "rationale"
  },
  db: {
    query: {
      messages: {
        findFirst: mocks.messageFindFirstMock
      }
    },
    insert: mocks.insertMock
  }
}));

import { POST } from "./route";

describe("POST /api/triage", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1"
    });
    mocks.classifyMessageTriageMock.mockResolvedValue({
      label: "needs_reply",
      confidence: 0.84,
      rationale: "Requires response"
    });
    mocks.returningMock.mockResolvedValue([
      {
        label: "needs_reply",
        confidence: 0.84,
        rationale: "Requires response"
      }
    ]);
    mocks.onConflictDoUpdateMock.mockReturnValue({
      returning: mocks.returningMock
    });
    mocks.valuesMock.mockReturnValue({
      onConflictDoUpdate: mocks.onConflictDoUpdateMock
    });
    mocks.insertMock.mockReturnValue({
      values: mocks.valuesMock
    });
  });

  it("returns 404 when message does not exist", async () => {
    mocks.messageFindFirstMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/triage", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          messageId: "123e4567-e89b-12d3-a456-426614174000"
        })
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "message not found"
    });
  });

  it("classifies and persists triage result", async () => {
    mocks.messageFindFirstMock.mockResolvedValue({
      id: "message-1",
      workspaceId: "workspace-1",
      subject: "Need feedback",
      textBody: "Can you review this?",
      senderEmail: "boss@example.com"
    });

    const response = await POST(
      new Request("http://localhost/api/triage", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          messageId: "123e4567-e89b-12d3-a456-426614174000"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      label: "needs_reply",
      confidence: 0.84,
      rationale: "Requires response"
    });
    expect(mocks.classifyMessageTriageMock).toHaveBeenCalledTimes(1);
  });
});
