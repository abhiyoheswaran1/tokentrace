import { getDatabasePath } from "@/src/db/client";
import { getAppSettings } from "@/src/db/settings";
import { getScanTrustData } from "@/src/lib/analytics";
import { SettingsPanel } from "@/components/settings-panel";
import { PageHeader } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getAppSettings();
  const scanTrust = getScanTrustData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure local discovery folders, privacy controls, scans, and imported data."
      />
      <SettingsPanel
        initialSettings={{
          ...settings,
          databasePath: getDatabasePath()
        }}
        initialScanHealth={scanTrust.health}
      />
    </div>
  );
}
