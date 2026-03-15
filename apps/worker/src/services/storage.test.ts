import { CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import { ensureBucketExists } from "./storage";

describe("ensureBucketExists", () => {
  it("creates the bucket when it is missing", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce({
        name: "NoSuchBucket",
        $metadata: {
          httpStatusCode: 404
        }
      })
      .mockResolvedValueOnce({});

    await ensureBucketExists({ send }, "syntheci-files");

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(CreateBucketCommand);
  });

  it("skips bucket creation when the bucket already exists", async () => {
    const send = vi.fn().mockResolvedValueOnce({});

    await ensureBucketExists({ send }, "syntheci-files");

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadBucketCommand);
  });

  it("tolerates concurrent bucket creation", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce({
        name: "NoSuchBucket",
        $metadata: {
          httpStatusCode: 404
        }
      })
      .mockRejectedValueOnce({
        name: "BucketAlreadyOwnedByYou"
      });

    await expect(ensureBucketExists({ send }, "syntheci-files")).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(CreateBucketCommand);
  });
});
