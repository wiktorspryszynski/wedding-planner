"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export const NAV = [
  { href: "/", label: "Pulpit", icon: "◈" },
  { href: "/guests", label: "Goście", icon: "☺" },
  { href: "/budget", label: "Budżet", icon: "zł" },
  { href: "/vendors", label: "Usługodawcy", icon: "✦" },
  { href: "/tasks", label: "Zadania", icon: "✓" },
  { href: "/seating", label: "Stoły", icon: "◯" },
  { href: "/settings", label: "Ustawienia", icon: "⚙" },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

export function SideNav() {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={cx(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
            isActive(n.href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-ink",
          )}
        >
          <span className="w-5 text-center">{n.icon}</span>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {NAV.slice(0, 6).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={cx(
            "flex flex-col items-center gap-0.5 py-2 text-[10px]",
            isActive(n.href) ? "text-accent" : "text-muted",
          )}
        >
          <span className="text-base leading-none">{n.icon}</span>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
