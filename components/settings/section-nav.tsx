export const SETTINGS_SECTION_IDS = [
  "scan-controls",
  "custom-folders",
  "import-profiles",
  "usage-guardrails",
  "package-trust",
  "scan-scheduling",
  "local-exports"
] as const;

const SETTINGS_SECTIONS: Array<{ id: (typeof SETTINGS_SECTION_IDS)[number]; label: string; detail: string }> = [
  { id: "scan-controls", label: "Scan Controls", detail: "Run Scan now and review the last result." },
  { id: "custom-folders", label: "Custom Folders", detail: "Add local folders outside the defaults." },
  { id: "import-profiles", label: "Import Profiles", detail: "Preview and enable local log conventions." },
  { id: "usage-guardrails", label: "Guardrails", detail: "Set local limits for cost and tokens." },
  { id: "package-trust", label: "Package Trust", detail: "Check package and supply-chain posture." },
  { id: "scan-scheduling", label: "Schedule", detail: "Control when local scans run." },
  { id: "local-exports", label: "Exports", detail: "Download local reports and evidence." }
];

export function SettingsSectionNav() {
  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-2 z-20 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <div className="sticky left-0 shrink-0 bg-background/95 pr-2 text-xs font-semibold text-foreground">
          Settings sections
        </div>
        {SETTINGS_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            title={section.detail}
            className="inline-flex h-8 shrink-0 items-center rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
