import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { WeddingDate } from "@/components/wedding-date";
import { BottomNav, SideNav } from "./nav";

async function UserBox() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted">
        Cześć, <span className="text-ink">{user.name}</span>
      </span>
      <Link href="/settings" className="ml-auto text-muted hover:text-ink lg:hidden" title="Ustawienia">
        ⚙
      </Link>
      <form action={logout} className="lg:ml-auto">
        <Button variant="ghost" size="sm">
          Wyloguj
        </Button>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-line p-5 lg:flex">
        <Link href="/" className="block leading-tight">
          <span className="block font-display text-xl font-medium">Spryszyński</span>
          <span className="block font-display text-xl font-medium">
            <span className="text-gold">&amp;</span> Guzowska
          </span>
        </Link>
        <Suspense>
          <WeddingDate className="-mt-4" />
        </Suspense>
        <SideNav />
        <div className="mt-auto">
          <Suspense>
            <UserBox />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-8 lg:pb-10">
        <div className="no-print mb-4 flex items-center justify-between gap-4 lg:hidden">
          <Link href="/" className="font-display text-lg font-medium">
            S<span className="text-gold">&amp;</span>G
          </Link>
          <Suspense>
            <UserBox />
          </Suspense>
        </div>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
