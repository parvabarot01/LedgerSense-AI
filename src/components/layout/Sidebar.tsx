"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  GitCompareArrows,
  ShieldCheck,
  FileText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Executive dashboard", icon: LayoutDashboard },
  { href: "/sources", label: "Data sources", icon: Database },
  { href: "/reconciliation-sets", label: "Reconciliation sets", icon: GitCompareArrows },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-hairline bg-paper">
      <div className="border-b border-hairline px-5 py-5">
        <p className="font-display text-lg text-ink-navy">LedgerSense</p>
        <p className="mt-0.5 truncate text-xs text-ink-navy-soft">{orgName}</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors duration-fast ease-out",
                active ? "text-ink-navy font-medium" : "text-ink-navy-soft hover:text-ink-navy"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brass" />
              )}
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-hairline px-2 py-3">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-ink-navy-soft transition-colors duration-fast ease-out hover:text-ink-navy"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
