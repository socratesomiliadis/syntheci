import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeMock: vi.fn()
}));

vi.mock("./client", () => ({
  db: {
    execute: mocks.executeMock
  }
}));

import { pingDatabase } from "./health";

describe("pingDatabase", () => {
  beforeEach(() => {
    mocks.executeMock.mockReset();
  });

  it("returns first row from the ping query", async () => {
    mocks.executeMock.mockResolvedValue({
      rows: [{ ok: 1 }]
    });

    await expect(pingDatabase()).resolves.toEqual({ ok: 1 });
    expect(mocks.executeMock).toHaveBeenCalledTimes(1);
  });
});
