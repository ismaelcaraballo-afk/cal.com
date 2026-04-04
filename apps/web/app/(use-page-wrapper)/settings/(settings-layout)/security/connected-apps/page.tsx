import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import ConnectedAppsView from "~/settings/security/connected-apps-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("connected_apps"),
    (t) => t("connected_apps_description"),
    undefined,
    undefined,
    "/settings/security/connected-apps"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("connected_apps")}
      description={t("connected_apps_description")}
      borderInShellHeader={true}>
      <ConnectedAppsView />
    </SettingsHeader>
  );
};

export default Page;
