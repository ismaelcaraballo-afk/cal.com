"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

type IntegrationItem = RouterOutputs["viewer"]["apps"]["integrations"]["items"][number];

// ─── Skeleton ────────────────────────────────────────────────────────────────

const SkeletonLoader = () => (
  <SkeletonContainer>
    <div className="border-subtle divide-subtle divide-y border-x">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <SkeletonText className="h-9 w-9 rounded-md" />
            <div className="space-y-2">
              <SkeletonText className="h-4 w-28" />
              <SkeletonText className="h-3 w-20" />
            </div>
          </div>
          <SkeletonButton className="h-8 w-16" />
        </div>
      ))}
    </div>
  </SkeletonContainer>
);

// ─── Single app row ───────────────────────────────────────────────────────────

function CredentialRow({
  app,
  credentialId,
  onRevoke,
}: {
  app: IntegrationItem;
  credentialId: number;
  onRevoke: (id: number, appName: string) => void;
}) {
  const categoryLabel = app.type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ (Calendar|Video|Payment|Crm|Automation)$/i, "");

  return (
    <div className="flex items-center justify-between px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        {app.logo ? (
          <img src={app.logo} alt={app.name} className="h-9 w-9 rounded-md object-contain" />
        ) : (
          <div className="bg-subtle flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold uppercase">
            {app.name.slice(0, 2)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emphasis text-sm font-medium">{app.name}</span>
            <Badge variant="gray" size="sm">
              {categoryLabel}
            </Badge>
          </div>
          <p className="text-subtle text-xs">Credential ID: {credentialId}</p>
        </div>
      </div>
      <Button color="destructive" size="sm" onClick={() => onRevoke(credentialId, app.name)}>
        Revoke
      </Button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function ConnectedAppsView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [revoking, setRevoking] = useState<{ id: number; appName: string } | null>(null);

  const { data, isPending } = trpc.viewer.apps.integrations.useQuery({ onlyInstalled: true });

  const mutation = trpc.viewer.credentials.delete.useMutation({
    onSuccess: () => {
      showToast(t("app_removed_successfully"), "success");
      setRevoking(null);
      utils.viewer.apps.integrations.invalidate();
      utils.viewer.calendars.connectedCalendars.invalidate();
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      setRevoking(null);
    },
  });

  if (isPending) return <SkeletonLoader />;

  // Flatten: one row per credential across all installed apps
  const rows = data?.items.flatMap((app) =>
    (app.credentials ?? []).map((cred) => ({ app, credentialId: cred.id }))
  ) ?? [];

  return (
    <>
      <div className="border-subtle rounded-b-xl border-x border-b">
        {rows.length === 0 ? (
          <EmptyScreen
            Icon="link"
            headline="No connected apps"
            description="Apps you connect from the App Store will appear here. You can revoke access at any time."
          />
        ) : (
          <div className="divide-subtle divide-y">
            {rows.map(({ app, credentialId }) => (
              <CredentialRow
                key={credentialId}
                app={app}
                credentialId={credentialId}
                onRevoke={(id, appName) => setRevoking({ id, appName })}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!revoking} onOpenChange={() => setRevoking(null)}>
        <DialogContent
          title={`Revoke ${revoking?.appName ?? "app"} access`}
          description="This will disconnect the app from your account. You can reconnect it at any time from the App Store.">
          <DialogFooter>
            <DialogClose />
            <Button
              color="destructive"
              loading={mutation.isPending}
              onClick={() => revoking && mutation.mutate({ id: revoking.id })}>
              Yes, revoke access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
