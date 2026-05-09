import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  Bug,
  ClipboardList,
  FolderGit2,
  Gauge,
  LineChart,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Terminal
} from "lucide-react";
import { formatAppVersion, getAppVersion } from "@/src/lib/app-version";

const navItems = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/tools", label: "Tools", icon: Terminal },
  { href: "/models", label: "Models", icon: Bot },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/sessions", label: "Sessions", icon: Search },
  { href: "/optimisation", label: "Insights", icon: Sparkles },
  { href: "/pricing", label: "Pricing", icon: SlidersHorizontal },
  { href: "/diagnostics", label: "Doctor", icon: ClipboardList },
  { href: "/discovery", label: "Discovery", icon: BarChart3 },
  { href: "/parser-debug", label: "Parsers", icon: Bug },
  { href: "/debug", label: "Raw Data", icon: Bug },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar({ appVersion = getAppVersion() }: { appVersion?: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-full flex-col">
        <div className="border-b p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">TokenTrace CLI</div>
              <div className="text-xs text-muted-foreground">Local analytics</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t p-4 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>TokenTrace version</span>
            <span className="font-medium text-foreground">{formatAppVersion(appVersion)}</span>
          </div>
          <p>Local only. No telemetry. Raw content off by default.</p>
          <p>
            Open source by{" "}
            <a
              href="https://github.com/abhiyoheswaran1"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Abhi Yoheswaran
            </a>
            .
          </p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b bg-card px-4 py-2 md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
