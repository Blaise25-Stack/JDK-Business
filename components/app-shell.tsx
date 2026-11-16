'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Sparkles,
  History,
  BarChart3,
  LogOut,
  Loader2,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/boissons', label: 'Boissons', icon: Package },
  { href: '/cremes', label: 'Crèmes', icon: Sparkles },
  { href: '/historique', label: 'Historique', icon: History },
  { href: '/rapports', label: 'Rapports', icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-white truncate">JDK-Business</span>
              <span className="hidden sm:inline text-xs text-emerald-400 border border-emerald-800 rounded-full px-2 py-0.5">
                FC (CDF)
              </span>
            </div>
            <button
              onClick={async () => {
                await signOut();
                router.replace('/login');
              }}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
        <nav className="border-t border-slate-800/60">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex gap-1 overflow-x-auto py-1.5 scrollbar-none">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-emerald-600/15 text-emerald-400 font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
