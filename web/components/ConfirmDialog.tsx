'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'brand' | 'amber' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE: Record<NonNullable<ConfirmDialogProps['tone']>, string> = {
  brand: 'bg-brand-600 hover:bg-brand-700',
  amber: 'bg-amber-500 hover:bg-amber-600',
  danger: 'bg-red-600 hover:bg-red-700',
};

/**
 * Modal de confirmación accesible (reemplaza window.confirm).
 * - role="dialog" + aria-modal, foco inicial en el botón confirmar.
 * - Cierra con Escape o clic en el backdrop.
 * - No bloquea el hilo: el flujo continúa vía callbacks.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'brand',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? 'confirm-desc' : undefined}
    >
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={() => !busy && onCancel()}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in">
        <h2 id="confirm-title" className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p id="confirm-desc" className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        )}
        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60',
              TONE[tone]
            )}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
