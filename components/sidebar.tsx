"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  BookOpen,
  Bug,
  ClipboardList,
  FolderGit2,
  Gauge,
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

const primaryNavItems = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/tools", label: "Tools", icon: Terminal },
  { href: "/models", label: "Models", icon: Bot },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/sessions", label: "Sessions", icon: Search },
  { href: "/optimisation", label: "Insights", icon: Sparkles },
  { href: "/repair", label: "Repair", icon: Wrench },
  { href: "/pricing", label: "Model Rates", icon: SlidersHorizontal },
  { href: "/diagnostics", label: "Scan Health", icon: ClipboardList },
  { href: "/discovery", label: "Discovery", icon: BarChart3 },
  { href: "/parser-debug", label: "Parsers", icon: Bug },
  { href: "/debug", label: "Raw Data", icon: Bug },
  { href: "/settings", label: "Settings", icon: Settings }
];

const supportNavItems = [
  { href: "/guide", label: "Guide", icon: BookOpen }
];

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
          ? "border-primary/30 bg-primary/10 font-medium text-primary shadow-sm"
          : variant === "support"
            ? "bg-muted/50 font-medium text-foreground"
            : "text-muted-foreground"
      )
    : cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary/10 font-medium text-primary"
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
        <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {primaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActiveRoute(pathname, item.href)} />
          ))}
        </nav>
        <nav aria-label="Help navigation" className="p-3">
          {supportNavItems.map((item) => (
            <NavLink key={item.href} item={item} variant="support" isActive={isActiveRoute(pathname, item.href)} />
          ))}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
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

  return (
    <nav aria-label="Mobile navigation" className="flex gap-2 overflow-x-auto border-b bg-card px-4 py-2 md:hidden">
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
    </nav>
  );
}
