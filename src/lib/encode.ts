/** base64url encode/decode for the shareable gift-card payload (no DB). */

export function encodeCard<T>(data: T): string {
  const json = JSON.stringify(data);
  const b64 = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCard<T>(s: string): T | null {
  try {
    let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const json =
      typeof atob !== "undefined"
        ? decodeURIComponent(escape(atob(b64)))
        : Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
