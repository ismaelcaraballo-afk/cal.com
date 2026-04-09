// Member 4: External Services — Zoom revocation
// Tells Zoom to invalidate the OAuth token when a user disconnects.
// NOTE: This function throws on failure so the service layer can apply
// graceful degradation (log + force local delete) when the provider is down.

import { revocationLogger } from "../logger";

export async function revokeZoom(credential: { key: Record<string, unknown> }): Promise<void> {
  const token = (credential?.key?.access_token as string) ?? null;

  if (!token) {
    revocationLogger.warn("[revocation][zoom] missing access_token; skipping remote revoke");
    return;
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    revocationLogger.warn("[revocation][zoom] missing client credentials; skipping remote revoke");
    return;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `https://zoom.us/oauth/revoke?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${basic}` },
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      throw new Error(`Zoom revoke failed ${res.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
