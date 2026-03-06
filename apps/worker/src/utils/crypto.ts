import crypto from "node:crypto";

const secret = process.env.BETTER_AUTH_SECRET ?? "replace-me";
const key = crypto.createHash("sha256").update(secret, "utf8").digest();

export function decryptSecret(ciphertext: string) {
  const payload = Buffer.from(ciphertext, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
