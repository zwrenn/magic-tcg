/**
 * Auth bits safe to import from BOTH the edge middleware and Node route
 * handlers. No database, no node:crypto — Web Crypto only.
 */

export const AUTH_COOKIE = "pod_auth";
export const USER_COOKIE = "pod_user";

/** SHA-256 hex of a string, via Web Crypto (works on edge + node). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The expected value of the auth cookie for the configured passphrase. */
export async function expectedAuthToken(): Promise<string> {
  const passphrase = process.env.POD_PASSPHRASE ?? "";
  // Salt so the cookie isn't a bare passphrase hash sitting in a rainbow table.
  return sha256Hex(`the-pod::${passphrase}`);
}

/**
 * Whether a passphrase is required at all. If POD_PASSPHRASE is unset/blank,
 * the gate just asks "who are you?" (no password).
 */
export function passphraseRequired(): boolean {
  return Boolean(process.env.POD_PASSPHRASE && process.env.POD_PASSPHRASE.trim());
}
