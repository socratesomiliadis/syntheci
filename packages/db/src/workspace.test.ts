import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirstMock: vi.fn()
}));

vi.mock("./client", () => ({
  db: {
    query: {
      memberships: {
        findFirst: mocks.findFirstMock
      }
    }
  }
}));

describe("assertWorkspaceAccess", () => {
  beforeEach(() => {
    mocks.findFirstMock.mockReset();
  });

  it("returns membership when access exists", async () => {
    mocks.findFirstMock.mockResolvedValue({
      id: "membership-1",
      workspaceId: "workspace-1",
      userId: "user-1"
    });

    const { assertWorkspaceAccess } = await import("./workspace");
    await expect(assertWorkspaceAccess("user-1", "workspace-1")).resolves.toMatchObject({
      id: "membership-1",
      workspaceId: "workspace-1"
    });
  });

  it("throws when membership does not exist", async () => {
    mocks.findFirstMock.mockResolvedValue(null);

    const { assertWorkspaceAccess } = await import("./workspace");
    await expect(assertWorkspaceAccess("user-1", "workspace-2")).rejects.toThrow(
      "Unauthorized workspace access"
    );
  });
});
