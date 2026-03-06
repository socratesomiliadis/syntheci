import { describe, expect, it } from "vitest";

import { buildIdempotencyKey } from "./idempotency";

describe("buildIdempotencyKey", () => {
  it("is deterministic for the same inputs", () => {
    const a = buildIdempotencyKey("gmail", "abc", "123");
    const b = buildIdempotencyKey("gmail", "abc", "123");
    expect(a).toBe(b);
  });

  it("changes when inputs change", () => {
    const a = buildIdempotencyKey("gmail", "abc", "123");
    const b = buildIdempotencyKey("gmail", "abc", "124");
    expect(a).not.toBe(b);
  });
});
