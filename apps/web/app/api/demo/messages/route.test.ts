import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContextMock: vi.fn(),
  getDemoGmailSourceMock: vi.fn(),
  createDemoMessageMock: vi.fn(),
  triageDemoMessageMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContextMock,
}));

vi.mock("@/lib/demo", () => ({
  getDemoGmailSource: mocks.getDemoGmailSourceMock,
  createDemoMessage: mocks.createDemoMessageMock,
  triageDemoMessage: mocks.triageDemoMessageMock,
}));

import { POST } from "./route";

describe("POST /api/demo/messages", () => {
  beforeEach(() => {
    mocks.requireWorkspaceContextMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    mocks.getDemoGmailSourceMock.mockResolvedValue({
      connectedAccountId: "account-1",
      sourceId: "source-1",
    });
    mocks.createDemoMessageMock.mockResolvedValue({
      id: "message-1",
      subject: "Need the final retention answer",
      textBody: "Can you send the final wording before 17:00?",
      htmlBody: null,
      senderName: "Priya Raman",
      senderEmail: "priya@catalystbank.com",
      receivedAt: new Date("2026-03-15T10:00:00.000Z"),
      isUnread: true,
    });
    mocks.triageDemoMessageMock.mockResolvedValue({
      label: "urgent",
      confidence: 0.94,
      rationale: "Same-day deadline",
    });
  });

  it("returns 403 when demo mode is unavailable", async () => {
    mocks.getDemoGmailSourceMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/demo/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          senderName: "Priya Raman",
          senderEmail: "priya@catalystbank.com",
          subject: "Need the final retention answer",
          body: "Can you send the final wording before 17:00?",
        }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "demo mode is not enabled for this workspace",
    });
  });

  it("creates and triages a demo email", async () => {
    const response = await POST(
      new Request("http://localhost/api/demo/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          senderName: "Priya Raman",
          senderEmail: "priya@catalystbank.com",
          subject: "Need the final retention answer",
          body: "Can you send the final wording before 17:00?",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: {
        id: "message-1",
        label: "urgent",
        confidence: 0.94,
      },
    });
    expect(mocks.createDemoMessageMock).toHaveBeenCalledTimes(1);
    expect(mocks.triageDemoMessageMock).toHaveBeenCalledTimes(1);
  });
});
