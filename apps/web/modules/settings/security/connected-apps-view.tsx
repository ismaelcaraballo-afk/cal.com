"use client";

import Image from "next/image";
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
  disabled,
}: {
  app: IntegrationItem;
  credentialId: number;
  onRevoke: (id: number, appName: string) => void;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const cleaned = app.type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ (Calendar|Video|Payment|Crm|Automation)$/i, "")
    .trim();
  const categoryLabel = cleaned || app.type;

  return (
    <div className="flex items-center justify-between px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        {app.logo ? (
          <Image
            src={app.logo}
            alt={app.name}
            width={36}
            height={36}
            className="rounded-md object-contain"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="bg-subtle flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold uppercase">
            {Array.from(app.name).slice(0, 2).join("")}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emphasis text-sm font-medium">{app.name}</span>
            <Badge variant="gray" size="sm">
              {categoryLabel}
            </Badge>
          </div>
          <p className="text-subtle text-xs">{categoryLabel}</p>
        </div>
      </div>
      <Button
        color="destructive"
        size="sm"
        disabled={disabled}
        aria-label={t("revoke_app_access_aria", { appName: app.name })}
        onClick={() => onRevoke(credentialId, app.name)}>
        {t("revoke")}
      </Button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function ConnectedAppsView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [revoking, setRevoking] = useState<{ id: number; appName: string } | null>(null);

  const { data, isPending, isError, refetch } = trpc.viewer.apps.integrations.useQuery({ onlyInstalled: true });

  const mutation = trpc.viewer.credentials.delete.useMutation({
    onSuccess: async () => {
      showToast(t("app_removed_successfully"), "success");
      setRevoking(null);
      // allSettled so one failing invalidation doesn't suppress the other
      await Promise.allSettled([
        utils.viewer.apps.integrations.invalidate(),
        utils.viewer.calendars.connectedCalendars.invalidate(),
      ]);
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
      setRevoking(null); // reset so dialog doesn't get stuck open on error
    },
  });

  if (isPending) return <SkeletonLoader />;
  if (isError)
    return (
      <EmptyScreen
        Icon="alert-triangle"
        headline={t("something_went_wrong")}
        description={t("error_loading_connected_apps")}
        buttonText={t("retry")}
        buttonOnClick={() => refetch()}
      />
    );

  // Flatten: one row per credential across all installed apps.
  // Filter out any credentials missing a numeric id to avoid type issues.
  const rows =
    data?.items?.flatMap((app) =>
      (app.credentials ?? [])
        .filter((cred): cred is typeof cred & { id: number } => typeof cred.id === "number")
        .map((cred) => ({ app, credentialId: cred.id }))
    ) ?? [];

  return (
    <>
      <div className="border-subtle rounded-b-xl border-x border-b">
        {rows.length === 0 ? (
          <EmptyScreen
            Icon="link"
            headline={t("no_connected_apps")}
            description={t("no_connected_apps_description")}
          />
        ) : (
          <div className="divide-subtle divide-y">
            {rows.map(({ app, credentialId }) => (
              <CredentialRow
                key={`${app.slug}-${credentialId}`}
                app={app}
                credentialId={credentialId}
                disabled={mutation.isPending}
                onRevoke={(id, appName) => setRevoking({ id, appName })}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!revoking}
        onOpenChange={(open) => {
          // Prevent closing while mutation is in-flight or during cache invalidation
          if (!open && !mutation.isPending && !mutation.isSuccess) setRevoking(null);
        }}>
        <DialogContent
          title={t("revoke_app_access", { appName: revoking?.appName ?? t("app") })}
          description={t("revoke_app_access_description")}>
          <DialogFooter>
            <DialogClose asChild>
              <Button color="secondary" disabled={mutation.isPending}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button
              color="destructive"
              loading={mutation.isPending}
              onClick={() => revoking && mutation.mutate({ id: revoking.id })}>
              {t("yes_revoke_access")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
