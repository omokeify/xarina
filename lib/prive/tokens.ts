import { createHash, randomBytes } from "node:crypto";

/** Random URL-safe secret for an access link or a Privé session cookie (rule 7). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is ever stored; the raw token lives in the link or cookie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
