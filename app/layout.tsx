import type { Metadata } from "next";
import "./globals.css";
import { MobileNav, Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "TokenTrace CLI",
  description: "Local-first AI CLI token and cost analytics"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <div className="border-b bg-card px-4 py-3 md:hidden">
              <div className="text-sm font-semibold">TokenTrace CLI</div>
              <div className="text-xs text-muted-foreground">Local analytics dashboard</div>
            </div>
            <MobileNav />
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
