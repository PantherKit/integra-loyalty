'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  ScanLine,
  Award,
  Share2,
  LogOut,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import IntegraLogo from '@/components/IntegraLogo';
import { DashboardCtx } from '@/components/dashboard-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import {
  clearToken,
  decodeJwtClaims,
  getMe,
  getToken,
  getMyMerchant,
  getBillingStatus,
  type Merchant,
  type BillingStatus,
} from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: '/dashboard/', label: 'Resumen', icon: LayoutGrid },
  { href: '/dashboard/give-stamp/', label: 'Dar sello', icon: ScanLine },
  { href: '/dashboard/programs/', label: 'Programa', icon: Award },
  { href: '/dashboard/share/', label: 'Compartir', icon: Share2 },
];

type SessionState =
  | { status: 'checking' }
  | { status: 'ready'; email: string; merchant: Merchant | null }
  | { status: 'denied' };

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>({ status: 'checking' });
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const here =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '/dashboard/';
    const loginUrl = `/login/?next=${encodeURIComponent(here)}`;
    const token = getToken();
    const devClaims = decodeJwtClaims();
    if (!token && !devClaims) {
      router.replace(loginUrl);
      return;
    }
    (async () => {
      try {
        const [me, merchant, billingStatus] = await Promise.all([
          token ? getMe() : Promise.resolve({ claims: devClaims! }),
          getMyMerchant().catch(() => null),
          getBillingStatus().catch(() => null),
        ]);
        if (!alive) return;
        setBilling(billingStatus);
        setSession({ status: 'ready', email: me.claims.email, merchant });
      } catch {
        if (!alive) return;
        clearToken();
        setSession({ status: 'denied' });
        setTimeout(() => router.replace(loginUrl), 1200);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // cierra el menú móvil al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearToken();
    router.replace('/login/');
  }

  if (session.status === 'checking') {
    return (
      <main className="flex-1 grid place-items-center px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-brand-600" />
          <p className="text-sm">Verificando tu sesión…</p>
        </div>
      </main>
    );
  }

  if (session.status === 'denied') {
    return (
      <main className="flex-1 grid place-items-center px-4">
        <Alert variant="destructive" className="max-w-sm">
          <AlertDescription>
            Tu sesión expiró. Redirigiéndote para iniciar sesión…
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const { email, merchant } = session;

  function daysLeft(iso: string): number {
    return Math.max(
      0,
      Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
    );
  }

  let trialBanner: React.ReactNode = null;
  if (billing && !billing.active) {
    trialBanner = (
      <div className="border-b border-destructive/20 bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <p className="text-sm font-medium text-destructive">
            {billing.subscriptionStatus === 'past_due'
              ? 'Tu pago no se procesó. Actualiza tu suscripción para seguir operando.'
              : 'Tu prueba terminó — Suscríbete para seguir dando sellos y creando programas.'}
          </p>
          <Button asChild size="sm" variant="destructive" className="shrink-0">
            <Link href="/dashboard/suscribirse/">Suscribirme</Link>
          </Button>
        </div>
      </div>
    );
  } else if (
    billing &&
    billing.subscriptionStatus === 'trialing' &&
    billing.trialEndsAt
  ) {
    const d = daysLeft(billing.trialEndsAt);
    trialBanner = (
      <div className="border-b border-warning/20 bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <p className="text-sm text-warning">
            Te {d === 1 ? 'queda' : 'quedan'}{' '}
            <span className="font-semibold">
              {d} {d === 1 ? 'día' : 'días'}
            </span>{' '}
            de prueba gratis.
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0 border-warning/30 text-warning hover:bg-warning/10">
            <Link href="/dashboard/suscribirse/">Ver planes</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/dashboard/'
      ? pathname === '/dashboard' || pathname === '/dashboard/'
      : pathname.startsWith(href.replace(/\/$/, ''));

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active
                ? 'bg-brand-50/90 text-brand-700'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={17} className={active ? 'text-brand-600' : 'text-muted-foreground'} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl border bg-card text-foreground">
        <IntegraLogo size={20} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">
          Integra <span className="text-brand-600">Loyalty</span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground max-w-[140px]">
          {merchant?.name ?? 'Tu comercio'}
        </p>
      </div>
    </div>
  );

  return (
    <DashboardCtx.Provider value={{ email, merchant }}>
      <div className="flex min-h-screen flex-1 bg-background">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="flex min-h-16 items-center px-4">{brand}</div>
          <Separator />
          <div className="flex-1 overflow-y-auto p-2">{navList}</div>
          <Separator />
          <div className="p-3">
            <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{email}</p>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut size={18} />
              Cerrar sesión
            </Button>
          </div>
        </aside>

        {/* Contenido */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar móvil */}
          <header className="flex min-h-16 items-center gap-3 border-b bg-card px-4 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menú">
                  <Menu size={22} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navegación del dashboard</SheetTitle>
                  <SheetDescription>
                    Menú principal de Integra Loyalty.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-5 py-5">{brand}</div>
                <Separator />
                <div className="flex-1 overflow-y-auto p-3">{navList}</div>
                <Separator />
                <div className="p-3">
                  <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
                    {email}
                  </p>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut size={18} />
                    Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            {brand}
            <Badge variant="outline" className="ml-auto font-mono text-muted-foreground">
              POC
            </Badge>
          </header>

          {trialBanner}

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardCtx.Provider>
  );
}
