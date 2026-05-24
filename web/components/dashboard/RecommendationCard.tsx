'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UserMinus,
  CalendarDays,
  Gift,
  Sparkles,
  ArrowRight,
  MessageCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Tipos duplicados intencionalmente del backend
 * (api/src/lib/recommendations/types.ts). Mantener en sync — el web está
 * configurado como static export y no comparte tsconfig con el api/.
 */
export type SignalType = 'churn_at_risk' | 'slow_day' | 'stale_redemption';
export type CtaKind = 'navigate' | 'whatsapp' | 'dismiss';

export interface Recommendation {
  id: string;
  signal_type: SignalType;
  copy: string;
  cta_label: string;
  cta_kind: CtaKind;
  cta_target?: string;
  evidence?: Record<string, unknown>;
}

const ICONS: Record<SignalType, LucideIcon> = {
  churn_at_risk: UserMinus,
  slow_day: CalendarDays,
  stale_redemption: Gift,
};

const ACCENTS: Record<SignalType, string> = {
  churn_at_risk: 'text-warning border-warning/30 bg-warning/5',
  slow_day: 'text-brand-600 border-brand-600/30 bg-brand-600/5',
  stale_redemption: 'text-success border-success/30 bg-success/5',
};

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const Icon = ICONS[recommendation.signal_type] ?? Sparkles;
  const accent = ACCENTS[recommendation.signal_type] ?? '';

  function onCta() {
    if (recommendation.cta_kind === 'dismiss') {
      setDismissed(true);
      return;
    }
    if (recommendation.cta_kind === 'whatsapp' && recommendation.cta_target) {
      window.open(recommendation.cta_target, '_blank', 'noopener,noreferrer');
      return;
    }
    // 'navigate' lo manejamos con next/link más abajo (asChild). Este callback
    // sirve sólo para los kinds que requieren JS.
  }

  const isNavigate =
    recommendation.cta_kind === 'navigate' && !!recommendation.cta_target;
  const ctaIcon =
    recommendation.cta_kind === 'whatsapp' ? (
      <MessageCircle size={15} />
    ) : recommendation.cta_kind === 'dismiss' ? (
      <X size={15} />
    ) : (
      <ArrowRight size={15} />
    );

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${accent}`}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {labelFor(recommendation.signal_type)}
          </p>
          <p className="mt-1 text-sm leading-snug text-foreground">
            {recommendation.copy}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
          {isNavigate ? (
            <Button asChild size="sm" variant="loyalty" className="justify-center">
              <Link href={recommendation.cta_target!}>
                {ctaIcon}
                {recommendation.cta_label}
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              variant={recommendation.cta_kind === 'dismiss' ? 'ghost' : 'loyalty'}
              onClick={onCta}
              className="justify-center"
            >
              {ctaIcon}
              {recommendation.cta_label}
            </Button>
          )}
          {recommendation.cta_kind !== 'dismiss' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              aria-label="Ocultar recomendación"
              className="justify-center px-2"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function labelFor(t: SignalType): string {
  switch (t) {
    case 'churn_at_risk':
      return 'Cliente en riesgo';
    case 'slow_day':
      return 'Día de bajo movimiento';
    case 'stale_redemption':
      return 'Premio sin canjear';
  }
}
