"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  BookOpen,
  Bug,
  ChevronDown,
  ClipboardList,
  Database,
  FolderGit2,
  Gauge,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Wrench
} from "lucide-react";
import { TokenTraceLogo } from "@/components/token-trace-logo";
import { formatAppVersion, getAppVersion } from "@/src/lib/app-version";
import { cn } from "@/src/lib/utils";

const overviewNavItem = { href: "/", label: "Overview", icon: Gauge };
const toolsNavItem = { href: "/tools", label: "Tools", icon: Terminal };
const modelsNavItem = { href: "/models", label: "Models", icon: Bot };
const projectsNavItem = { href: "/projects", label: "Projects", icon: FolderGit2 };
const sessionsNavItem = { href: "/sessions", label: "Sessions", icon: Search };
const insightsNavItem = { href: "/optimisation", label: "Insights", icon: Sparkles };
const queryNavItem = { href: "/query", label: "Query", icon: Database };
const repairNavItem = { href: "/repair", label: "Repair", icon: Wrench };
const pricingNavItem = { href: "/pricing", label: "Model Rates", icon: SlidersHorizontal };
const diagnosticsNavItem = { href: "/diagnostics", label: "Scan Health", icon: ClipboardList };
const discoveryNavItem = { href: "/discovery", label: "Discovery", icon: BarChart3 };
const parsersNavItem = { href: "/parser-debug", label: "Parsers", icon: Bug };
const rawDataNavItem = { href: "/debug", label: "Raw Data", icon: Bug };
const settingsNavItem = { href: "/settings", label: "Settings", icon: Settings };

const navSections = [
  {
    label: "Analyze",
    items: [overviewNavItem, toolsNavItem, modelsNavItem, projectsNavItem]
  },
  {
    label: "Investigate",
    items: [sessionsNavItem, insightsNavItem, queryNavItem, repairNavItem]
  },
  {
    label: "Maintain",
    items: [
      pricingNavItem,
      diagnosticsNavItem,
      discoveryNavItem,
      parsersNavItem,
      rawDataNavItem,
      settingsNavItem
    ]
  }
];

const supportNavItems = [
  { href: "/guide", label: "Guide", icon: BookOpen }
];

const primaryNavItems = navSections.flatMap((section) => section.items);
const sidebarSections = [
  ...navSections.map((section) => ({ ...section, variant: "default" as const })),
  { label: "Reference", items: supportNavItems, variant: "support" as const }
];

const priorityMobileItems = primaryNavItems.filter((item) =>
  ["/", "/sessions", "/repair", "/diagnostics", "/settings"].includes(item.href)
);

function NavLink({
  item,
  variant = "default",
  isActive = false,
  mobile = false
}: {
  item: (typeof primaryNavItems)[number] | (typeof supportNavItems)[number];
  variant?: "default" | "support";
  isActive?: boolean;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  const className = mobile
    ? cn(
        "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors",
        isActive
          ? "border-primary/30 bg-primary/10 font-medium text-primary shadow-xs"
          : variant === "support"
            ? "bg-muted/50 font-medium text-foreground"
            : "text-muted-foreground"
      )
    : cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-muted font-medium text-primary shadow-xs ring-1 ring-border/60"
          : variant === "support"
            ? "border bg-muted/40 font-medium text-foreground hover:bg-muted"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      );

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function MobileIconLink({
  item,
  isActive = false
}: {
  item: (typeof primaryNavItems)[number];
  isActive?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors",
        isActive
          ? "border-primary/30 bg-primary/10 text-primary shadow-xs"
          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ appVersion = getAppVersion() }: { appVersion?: string }) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-full flex-col">
        <div className="border-b p-5">
          <div className="flex items-center gap-2">
            <TokenTraceLogo className="h-9 w-9 shrink-0" />
            <div>
              <div className="text-sm font-semibold">TokenTrace CLI</div>
              <div className="text-xs text-muted-foreground">Local only · No telemetry</div>
            </div>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {sidebarSections.map((section) => (
              <section key={section.label} aria-label={`${section.label} navigation`} className="space-y-1">
                <div className="px-3 pb-1 text-[0.68rem] font-semibold uppercase leading-none tracking-normal text-muted-foreground">
                  {section.label}
                </div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    variant={section.variant}
                    isActive={isActiveRoute(pathname, item.href)}
                  />
                ))}
              </section>
            ))}
          </div>
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          <div className="mb-2 text-[0.68rem] font-semibold uppercase leading-none tracking-normal text-muted-foreground">
            Local processing
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-relaxed">
            <span className="font-medium text-foreground">{formatAppVersion(appVersion)}</span>
            <span aria-hidden="true">·</span>
            <span>
              Open source by{" "}
              <a
                href="https://www.abhiyoheswaran.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-2 hover:text-foreground hover:underline"
              >
                Abhi Yoheswaran
              </a>
              .
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const mobileNavItems = [...primaryNavItems, ...supportNavItems];
  const pathname = usePathname() ?? "/";
  const activeMobileItem =
    mobileNavItems.find((item) => isActiveRoute(pathname, item.href)) ?? overviewNavItem;
  const ActiveIcon = activeMobileItem.icon;

  return (
    <nav aria-label="Mobile navigation" className="relative border-b bg-card px-3 py-2 md:hidden">
      <div className="flex items-center gap-2">
        <details className="group min-w-0 flex-1">
          <summary
            aria-label="Command menu"
            className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium [&::-webkit-details-marker]:hidden"
          >
            <Menu className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <ActiveIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{activeMobileItem.label}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="absolute left-3 right-3 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-md border bg-card p-2 shadow-lg">
            <div className="grid grid-cols-2 gap-1">
              {mobileNavItems.map((item) => {
                const isSupport = item.href === "/guide";
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    variant={isSupport ? "support" : "default"}
                    isActive={isActiveRoute(pathname, item.href)}
                    mobile
                  />
                );
              })}
            </div>
          </div>
        </details>
        <div className="flex shrink-0 gap-1" aria-label="Priority mobile shortcuts">
          {priorityMobileItems.map((item) => (
            <MobileIconLink
              key={item.href}
              item={item}
              isActive={isActiveRoute(pathname, item.href)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
