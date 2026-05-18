'use client';

import { createContext, useContext } from 'react';
import type { Merchant } from '@/lib/api';

export interface DashboardContextValue {
  email: string;
  merchant: Merchant | null;
}

export const DashboardCtx = createContext<DashboardContextValue | null>(null);

/** Datos de sesión validada del comercio. Solo válido dentro de DashboardShell. */
export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardCtx);
  if (!ctx) {
    throw new Error('useDashboard debe usarse dentro de DashboardShell');
  }
  return ctx;
}
