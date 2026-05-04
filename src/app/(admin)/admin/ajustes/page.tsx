import { getStoreSettings } from "@/lib/catalog";
import { updateStoreSettingsAction } from "@/actions/admin";
import { SettingsPageClient } from "@/components/admin/settings-page-client";
import { isCloudinaryConfigured, isDatabaseConfigured } from "@/lib/env";

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();
  const databaseReady = isDatabaseConfigured();
  const cloudinaryReady = isCloudinaryConfigured();

  return (
    <SettingsPageClient
      action={updateStoreSettingsAction}
      cloudinaryEnabled={cloudinaryReady}
      disabled={!databaseReady}
      disabledReason={!databaseReady ? "Conecta Neon para guardar ajustes persistentes." : undefined}
      settings={settings}
    />
  );
}