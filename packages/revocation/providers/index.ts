// Member 4: External Services — Provider router
// Routes a credential to the correct revocation handler based on its type.
// Throws on failure so the service layer can apply graceful degradation.

import { revokeGoogle } from "./google";
import { revokeZoom } from "./zoom";
import { revokeStripe } from "./stripe";
import { revocationLogger } from "../logger";

export interface CredentialKey {
  access_token?: string;
  [key: string]: unknown;
}

export async function revokeCredential(credential: { type: string; key: CredentialKey }): Promise<void> {
  if (credential.type.startsWith("google_")) {
    return revokeGoogle(credential);
  } else if (credential.type.startsWith("zoom_")) {
    return revokeZoom(credential);
  } else if (credential.type.startsWith("stripe_")) {
    return revokeStripe(credential);
  } else {
    // Unknown provider — no remote revocation needed, local delete is enough.
    revocationLogger.warn(`[revocation] No remote revocation handler for type: ${credential.type}`);
  }
}
