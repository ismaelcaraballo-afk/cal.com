import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ConnectedAppsView from "../connected-apps-view";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string, opts?: Record<string, unknown>) => opts?.appName ?? opts?.count ?? key }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockMutate = vi.fn();
let mockQueryState = { data: undefined as unknown, isPending: false, isError: false, refetch: vi.fn() };
let mockMutationState = { isPending: false, isSuccess: false, mutate: mockMutate };

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        apps: { integrations: { invalidate: mockInvalidate } },
        calendars: { connectedCalendars: { invalidate: mockInvalidate } },
      },
    }),
    viewer: {
      apps: {
        integrations: {
          useQuery: () => mockQueryState,
        },
      },
      credentials: {
        delete: {
          useMutation: ({ onSuccess, onError }: { onSuccess: () => void; onError: () => void }) => ({
            ...mockMutationState,
            mutate: (args: unknown) => {
              mockMutate(args);
              onSuccess();
            },
          }),
        },
      },
    },
  },
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeApp = (overrides?: object) => ({
  name: "Google Calendar",
  slug: "google-calendar",
  type: "google_calendar",
  logo: null,
  credentials: [{ id: 42, lastUsedAt: null, isStale: false }],
  ...overrides,
});

const makeStaleApp = () =>
  makeApp({
    name: "Zoom",
    slug: "zoom",
    type: "zoom_video",
    credentials: [{ id: 99, lastUsedAt: "2025-01-01T00:00:00Z", isStale: true }],
  });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ConnectedAppsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryState = { data: undefined, isPending: false, isError: false, refetch: vi.fn() };
    mockMutationState = { isPending: false, isSuccess: false, mutate: mockMutate };
  });

  it("shows skeleton while loading", () => {
    mockQueryState = { ...mockQueryState, isPending: true };
    const { container } = render(<ConnectedAppsView />);
    // SkeletonContainer renders placeholder divs — no credential rows visible
    expect(screen.queryByRole("button", { name: /revoke/i })).toBeNull();
    expect(container.firstChild).toBeTruthy();
  });

  it("shows error state when query fails", () => {
    mockQueryState = { ...mockQueryState, isError: true };
    render(<ConnectedAppsView />);
    expect(screen.getByText("something_went_wrong")).toBeInTheDocument();
    expect(screen.getByText("retry")).toBeInTheDocument();
  });

  it("shows empty state when no credentials", () => {
    mockQueryState = { ...mockQueryState, data: { items: [] } };
    render(<ConnectedAppsView />);
    expect(screen.getByText("no_connected_apps")).toBeInTheDocument();
  });

  it("renders a credential row", () => {
    mockQueryState = { ...mockQueryState, data: { items: [makeApp()] } };
    render(<ConnectedAppsView />);
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google Calendar" })).toBeInTheDocument();
  });

  it("shows stale badge for stale credentials", () => {
    mockQueryState = { ...mockQueryState, data: { items: [makeStaleApp()] } };
    render(<ConnectedAppsView />);
    expect(screen.getByTestId("stale-badge")).toBeInTheDocument();
    expect(screen.getByText("stale")).toBeInTheDocument();
  });

  it("does not show stale badge for active credentials", () => {
    mockQueryState = { ...mockQueryState, data: { items: [makeApp()] } };
    render(<ConnectedAppsView />);
    expect(screen.queryByTestId("stale-badge")).toBeNull();
  });

  it("opens confirmation dialog when revoke is clicked", () => {
    mockQueryState = { ...mockQueryState, data: { items: [makeApp()] } };
    render(<ConnectedAppsView />);
    fireEvent.click(screen.getByRole("button", { name: "Google Calendar" }));
    expect(screen.getByText("yes_revoke_access")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("calls mutation with credential id on confirm", () => {
    mockQueryState = { ...mockQueryState, data: { items: [makeApp()] } };
    render(<ConnectedAppsView />);
    fireEvent.click(screen.getByRole("button", { name: "Google Calendar" }));
    fireEvent.click(screen.getByText("yes_revoke_access"));
    expect(mockMutate).toHaveBeenCalledWith({ id: 42 });
  });

  it("disables revoke buttons while mutation is pending", () => {
    mockQueryState = { ...mockQueryState, data: { items: [makeApp()] } };
    mockMutationState = { ...mockMutationState, isPending: true };
    render(<ConnectedAppsView />);
    const revokeBtn = screen.getByRole("button", { name: "Google Calendar" });
    expect(revokeBtn).toBeDisabled();
  });
});
