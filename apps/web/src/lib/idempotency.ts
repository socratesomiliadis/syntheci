import crypto from "node:crypto";

export function buildIdempotencyKey(...parts: Array<string | number | null | undefined>) {
  return crypto.createHash("sha256").update(parts.filter(Boolean).join(":")).digest("hex");
}
