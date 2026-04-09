import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CredentialsRepository } from "./credentials.repository";
import { revokeCredential as callProviderRevocation } from "@calcom/revocation/providers";
import type { CredentialResponseDto } from "./dto/credential-response.dto";

// How many days without use before a credential is considered stale.
// Override via CREDENTIAL_STALE_DAYS env variable.
const STALE_DAYS = process.env.CREDENTIAL_STALE_DAYS
  ? parseInt(process.env.CREDENTIAL_STALE_DAYS, 10)
  : 30;

interface CredentialRow {
  id: number;
  type: string;
  appId?: string | null;
  lastUsedAt?: Date | null;
}

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);

  constructor(private readonly credentialsRepo: CredentialsRepository) {}

  // Member 2: GET /credentials
  // Returns all connected app credentials for the authenticated user,
  // with a computed isStale flag indicating connection health.
  async getCredentialsForUser(userId: number): Promise<CredentialResponseDto[]> {
    const creds = await this.credentialsRepo.getAllUserCredentialsById(userId);
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

    return (creds as CredentialRow[]).map((c) => {
      const lastUsedAt = c.lastUsedAt ?? null;
      return {
        id: c.id,
        type: c.type,
        appId: c.appId ?? null,
        lastUsedAt,
        isStale: !lastUsedAt || lastUsedAt < cutoff,
      };
    });
  }

  // Member 3: DELETE /credentials/:id
  // Revokes a connected app: verifies ownership, calls provider revocation,
  // then removes the credential row from the database.
  // Graceful degradation: if the provider is down, we still delete locally
  // so the user is never permanently stuck with a broken connection.
  async revokeCredential(credentialId: number, userId: number) {
    const credential = await this.credentialsRepo.findCredentialByIdAndUserId(credentialId, userId);
    if (!credential) throw new NotFoundException("Credential not found");

    try {
      await callProviderRevocation(credential);
    } catch (providerError) {
      // Provider is down or refused — log but don't block local cleanup.
      const message = providerError instanceof Error ? providerError.message : String(providerError);
      this.logger.warn(
        `Provider revocation failed for credential ${credentialId} (user ${userId}) — forcing local delete anyway: ${message}`
      );
    }

    await this.credentialsRepo.deleteUserCredentialById(userId, credentialId);

    this.logger.log(
      `[AUDIT] User ${userId} revoked credential ${credentialId} at ${new Date().toISOString()}`
    );

    return { success: true, message: "Credential revoked" };
  }
}
