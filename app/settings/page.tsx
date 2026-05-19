import { getDatabasePath } from "@/src/db/client";
import { getAppSettings } from "@/src/db/settings";
import { getScanTrustData } from "@/src/lib/analytics";
import { getAppVersion } from "@/src/lib/app-version";
import type { ScanHealth } from "@/src/lib/scan-health";
import { SettingsPanel, type SettingsScanHealth } from "@/components/settings-panel";
import { PageHeader } from "@/components/ui/typography";

export const dynamic = "force-dynamic";

function toSettingsScanHealth(health: ScanHealth): SettingsScanHealth {
  return {
    latestRun: health.latestRun,
    headline: health.headline,
    tone: health.tone,
    latestWarnings: health.latestWarnings,
    latestErrors: health.latestErrors,
    costCoverage: {
      priced: health.costCoverage.priced,
      unknown: health.costCoverage.unknown,
      total: health.costCoverage.total
    }
  };
}

export default function SettingsPage() {
  const settings = getAppSettings();
  const scanTrust = getScanTrustData({}, { scanFileScope: "latest" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure local discovery folders, privacy controls, scans, and imported data."
      />
      <SettingsPanel
        initialSettings={{
          ...settings,
          databasePath: getDatabasePath(),
          appVersion: getAppVersion()
        }}
        initialScanHealth={toSettingsScanHealth(scanTrust.health)}
      />
    </div>
  );
}
