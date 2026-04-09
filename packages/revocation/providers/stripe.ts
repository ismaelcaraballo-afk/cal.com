// Member 4: External Services — Stripe revocation
// Stripe doesn't have a token revocation endpoint — the credential
// is an API key, not an OAuth token.
// Disconnecting means removing it locally only.

import { revocationLogger } from "../logger";

export async function revokeStripe(_credential: { key: Record<string, unknown> }): Promise<void> {
  // No external HTTP call needed for Stripe.
  // Removing the credential row in the DB is sufficient to
  // disconnect the integration — the key simply stops being used.
  revocationLogger.log("[revocation][stripe] Stripe credential disconnected (local only, no HTTP call)");
}
