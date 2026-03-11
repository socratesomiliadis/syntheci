import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const queueAddMocks: Array<ReturnType<typeof vi.fn>> = [];
  const QueueMock = vi.fn().mockImplementation(() => {
    const add = vi.fn();
    queueAddMocks.push(add);
    return {
      add
    };
  });

  return {
    queueAddMocks,
    QueueMock,
    workspacesFindManyMock: vi.fn(),
    briefingsFindFirstMock: vi.fn(),
    connectedAccountsFindManyMock: vi.fn()
  };
});

vi.mock("bullmq", () => ({
  Queue: mocks.QueueMock
}));

vi.mock("@syntheci/db", () => ({
  briefings: {
    workspaceId: "workspace_id",
    briefingDate: "briefing_date"
  },
  connectedAccounts: {
    provider: "provider"
  },
  db: {
    query: {
      workspaces: {
        findMany: mocks.workspacesFindManyMock
      },
      briefings: {
        findFirst: mocks.briefingsFindFirstMock
      },
      connectedAccounts: {
        findMany: mocks.connectedAccountsFindManyMock
      }
    }
  }
}));

vi.mock("./redis", () => ({
  redis: {}
}));

vi.mock("./logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn()
  }
}));

import {
  enqueueDueDailyBriefings,
  enqueueDueGmailPollSync
} from "./scheduling";

describe("scheduler queueing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T09:05:00.000Z"));

    mocks.workspacesFindManyMock.mockReset();
    mocks.briefingsFindFirstMock.mockReset();
    mocks.connectedAccountsFindManyMock.mockReset();

    for (const addMock of mocks.queueAddMocks) {
      addMock.mockReset();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enqueues daily briefing at 09:00 local time when not already generated", async () => {
    mocks.workspacesFindManyMock.mockResolvedValue([
      {
        id: "workspace-1",
        timezone: "UTC"
      }
    ]);
    mocks.briefingsFindFirstMock.mockResolvedValue(null);

    await enqueueDueDailyBriefings();

    expect(mocks.queueAddMocks[0]).toHaveBeenCalledTimes(1);
    expect(mocks.queueAddMocks[0]).toHaveBeenCalledWith(
      "generate-briefing",
      expect.objectContaining({
        workspaceId: "workspace-1",
        briefingDate: "2026-03-07"
      }),
      expect.objectContaining({
        attempts: 3
      })
    );
  });

  it("skips daily briefing outside the 09:00 window", async () => {
    vi.setSystemTime(new Date("2026-03-07T08:30:00.000Z"));
    mocks.workspacesFindManyMock.mockResolvedValue([
      {
        id: "workspace-1",
        timezone: "UTC"
      }
    ]);

    await enqueueDueDailyBriefings();

    expect(mocks.queueAddMocks[0]).not.toHaveBeenCalled();
    expect(mocks.briefingsFindFirstMock).not.toHaveBeenCalled();
  });

  it("enqueues Gmail sync for each connected Google account", async () => {
    mocks.connectedAccountsFindManyMock.mockResolvedValue([
      {
        id: "account-1",
        workspaceId: "workspace-1"
      },
      {
        id: "account-2",
        workspaceId: "workspace-2"
      }
    ]);

    await enqueueDueGmailPollSync();

    expect(mocks.queueAddMocks[1]).toHaveBeenCalledTimes(2);
    expect(mocks.queueAddMocks[1]).toHaveBeenCalledWith(
      "sync-gmail-account",
      expect.objectContaining({
        connectedAccountId: "account-1"
      }),
      expect.objectContaining({
        attempts: 3
      })
    );
    expect(mocks.queueAddMocks[1]).toHaveBeenCalledWith(
      "sync-gmail-account",
      expect.objectContaining({
        connectedAccountId: "account-2"
      }),
      expect.objectContaining({
        attempts: 3
      })
    );
  });
});
