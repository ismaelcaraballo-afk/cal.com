// Member 4: External Services — Google revocation
// When a Google credential is deleted, we must also tell Google
// to invalidate the token on their end.
// NOTE: This function throws on failure so the service layer can apply
// graceful degradation (log + force local delete) when the provider is down.

import { revocationLogger } from "../logger";

export async function revokeGoogle(credential: { key: Record<string, unknown> }): Promise<void> {
  const token = (credential?.key?.access_token as string) ?? null;

  if (!token) {
    revocationLogger.warn("[revocation][google] missing access_token; skipping remote revoke");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      throw new Error(`Google revoke failed ${res.status}: ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
