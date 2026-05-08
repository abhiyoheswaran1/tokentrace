import { getDatabasePath } from "@/src/db/client";
import { getAppSettings } from "@/src/db/settings";
import { getScanTrustData } from "@/src/lib/analytics";
import { SettingsPanel } from "@/components/settings-panel";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getAppSettings();
  const scanTrust = getScanTrustData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure local discovery folders, privacy controls, scans, and imported data.
        </p>
      </div>
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
