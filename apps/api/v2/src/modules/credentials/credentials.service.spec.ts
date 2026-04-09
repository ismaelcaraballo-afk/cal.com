import { NotFoundException } from "@nestjs/common";
import { CredentialsService } from "./credentials.service";
import type { CredentialsRepository } from "./credentials.repository";
import { revokeCredential as callProviderRevocation } from "@calcom/revocation/providers";

jest.mock("@calcom/revocation/providers", () => ({
  revokeCredential: jest.fn(),
}));

describe("CredentialsService", () => {
  const repo = {
    getAllUserCredentialsById: jest.fn(),
    findCredentialByIdAndUserId: jest.fn(),
    deleteUserCredentialById: jest.fn(),
  } as unknown as jest.Mocked<CredentialsRepository>;

  let service: CredentialsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CredentialsService(repo);
  });

  it("returns mapped credentials and marks missing usage as stale", async () => {
    repo.getAllUserCredentialsById.mockResolvedValue([
      { id: 1, type: "google_calendar", appId: "google-calendar" },
      {
        id: 2,
        type: "zoom_video",
        appId: "zoom",
        lastUsedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ] as unknown as Awaited<ReturnType<CredentialsRepository["getAllUserCredentialsById"]>>);

    const result = await service.getCredentialsForUser(42);

    expect(result).toEqual([
      {
        id: 1,
        type: "google_calendar",
        appId: "google-calendar",
        lastUsedAt: null,
        isStale: true,
      },
      expect.objectContaining({
        id: 2,
        type: "zoom_video",
        appId: "zoom",
        isStale: false,
      }),
    ]);
  });

  it("revokes a credential and deletes it", async () => {
    repo.findCredentialByIdAndUserId.mockResolvedValue({
      id: 7,
      type: "google_calendar",
      key: { access_token: "tok" },
    } as unknown as Awaited<ReturnType<CredentialsRepository["findCredentialByIdAndUserId"]>>);
    repo.deleteUserCredentialById.mockResolvedValue(undefined as never);

    await service.revokeCredential(7, 99);

    expect(callProviderRevocation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, type: "google_calendar" })
    );
    expect(repo.deleteUserCredentialById).toHaveBeenCalledWith(99, 7);
  });

  it("throws when credential is not found", async () => {
    repo.findCredentialByIdAndUserId.mockResolvedValue(null);

    await expect(service.revokeCredential(999, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("still deletes locally when provider revocation throws", async () => {
    repo.findCredentialByIdAndUserId.mockResolvedValue({
      id: 5,
      type: "google_calendar",
      key: { access_token: "tok" },
    } as unknown as Awaited<ReturnType<CredentialsRepository["findCredentialByIdAndUserId"]>>);
    (callProviderRevocation as jest.Mock).mockRejectedValue(new Error("Google 503"));
    repo.deleteUserCredentialById.mockResolvedValue(undefined as never);

    // Should not throw — graceful degradation
    await expect(service.revokeCredential(5, 1)).resolves.toEqual({
      success: true,
      message: "Credential revoked",
    });

    // Local delete must still happen even though provider failed
    expect(repo.deleteUserCredentialById).toHaveBeenCalledWith(1, 5);
  });

  it("marks credential used just before cutoff as fresh", async () => {
    // 1ms before the stale threshold — should NOT be stale
    const justFresh = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000 - 1));
    repo.getAllUserCredentialsById.mockResolvedValue([
      { id: 3, type: "zoom_video", appId: "zoom", lastUsedAt: justFresh },
    ] as unknown as Awaited<ReturnType<CredentialsRepository["getAllUserCredentialsById"]>>);

    const result = await service.getCredentialsForUser(1);
    expect(result[0].isStale).toBe(false);
  });

  it("returns empty array when user has no credentials", async () => {
    repo.getAllUserCredentialsById.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<CredentialsRepository["getAllUserCredentialsById"]>>
    );

    const result = await service.getCredentialsForUser(1);
    expect(result).toEqual([]);
  });
});
