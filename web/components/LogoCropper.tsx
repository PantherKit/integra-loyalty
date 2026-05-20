'use client';

import { useEffect, useRef, useState } from 'react';

interface Crop {
  /** En coords de la imagen original (no de display). */
  x: number;
  y: number;
  size: number;
}

type Handle = 'move' | 'tl' | 'tr' | 'bl' | 'br';

interface DragState {
  kind: Handle;
  startImgX: number;
  startImgY: number;
  startCrop: Crop;
}

/** Detecta el color de fondo (sampleando las 4 esquinas) y lo reemplaza por
 *  transparente, con feathering en los bordes anti-aliased para no dejar
 *  sierra. Si las esquinas no son uniformes, no toca nada (fondo coloreado
 *  intencional). */
function keyOutBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    return;
  }
  const data = imageData.data;
  const px = (x: number, y: number): readonly [number, number, number, number] => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const allTransparent = corners.every(([, , , a]) => a < 32);
  if (allTransparent) return;
  const [r0, g0, b0, a0] = corners[0];
  const uniform =
    a0 >= 180 &&
    corners.every(
      ([r, g, b, a]) =>
        a >= 180 &&
        Math.abs(r - r0) <= 18 &&
        Math.abs(g - g0) <= 18 &&
        Math.abs(b - b0) <= 18,
    );
  if (!uniform) return;

  const FULL_BG = 14;
  const FULL_FG = 44;
  const RANGE = FULL_FG - FULL_BG;
  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - r0);
    const dg = Math.abs(data[i + 1] - g0);
    const db = Math.abs(data[i + 2] - b0);
    const diff = Math.max(dr, dg, db);
    if (diff <= FULL_BG) {
      data[i + 3] = 0;
    } else if (diff < FULL_FG) {
      // feather: alpha proporcional al alejamiento del color de fondo
      const t = (diff - FULL_BG) / RANGE;
      data[i + 3] = Math.round(data[i + 3] * t);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export interface LogoCropperProps {
  /** Data URL del archivo subido por el usuario. */
  src: string;
  /** Lado del PNG final. Default 60. */
  outputSize?: number;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

const HANDLE_CURSOR: Record<Exclude<Handle, 'move'>, string> = {
  tl: 'nwse-resize',
  br: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
};

export default function LogoCropper({
  src,
  outputSize = 60,
  onConfirm,
  onCancel,
}: LogoCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Crop | null>(null);
  const [dragging, setDragging] = useState(false);

  function init() {
    const img = imgRef.current;
    if (!img) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    setNatural({ w: iw, h: ih });
    requestAnimationFrame(() => {
      const el = imgRef.current;
      if (!el) return;
      setDisplay({ w: el.clientWidth, h: el.clientHeight });
    });
    const side = Math.floor(Math.min(iw, ih) * 0.9);
    setCrop({
      x: Math.floor((iw - side) / 2),
      y: Math.floor((ih - side) / 2),
      size: side,
    });
  }

  // Repinta el preview 60x60 cada vez que cambia el crop.
  useEffect(() => {
    const canvas = previewRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !crop) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.size,
      crop.size,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    keyOutBackground(ctx, canvas.width, canvas.height);
  }, [crop]);

  // Listeners de drag a nivel documento (más robusto que en el div).
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, natural, display.w]);

  function startDrag(kind: Handle, e: React.PointerEvent<HTMLDivElement>) {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const s = natural && rect.width ? natural.w / rect.width : 1;
    dragRef.current = {
      kind,
      startImgX: (e.clientX - rect.left) * s,
      startImgY: (e.clientY - rect.top) * s,
      startCrop: { ...crop },
    };
    setDragging(true);
  }

  function handlePointerMove(e: PointerEvent) {
    const d = dragRef.current;
    const img = imgRef.current;
    if (!d || !img || !natural) return;
    const rect = img.getBoundingClientRect();
    const s = rect.width ? natural.w / rect.width : 1;
    const imgX = (e.clientX - rect.left) * s;
    const imgY = (e.clientY - rect.top) * s;
    const dx = imgX - d.startImgX;
    const dy = imgY - d.startImgY;
    const c = d.startCrop;

    if (d.kind === 'move') {
      const x = Math.max(0, Math.min(natural.w - c.size, c.x + dx));
      const y = Math.max(0, Math.min(natural.h - c.size, c.y + dy));
      setCrop({ x, y, size: c.size });
      return;
    }

    // Resize cuadrado, anclado a la esquina opuesta.
    let delta = 0;
    if (d.kind === 'tl') delta = Math.max(-dx, -dy);
    else if (d.kind === 'tr') delta = Math.max(dx, -dy);
    else if (d.kind === 'bl') delta = Math.max(-dx, dy);
    else delta = Math.max(dx, dy); // br

    const MIN = 24;
    const MAX = Math.min(natural.w, natural.h);
    let newSize = Math.max(MIN, Math.min(MAX, c.size + delta));

    let nx = c.x;
    let ny = c.y;
    if (d.kind === 'tl' || d.kind === 'bl') nx = c.x + c.size - newSize;
    if (d.kind === 'tl' || d.kind === 'tr') ny = c.y + c.size - newSize;
    if (nx < 0) {
      newSize += nx;
      nx = 0;
    }
    if (ny < 0) {
      newSize += ny;
      ny = 0;
    }
    if (nx + newSize > natural.w) newSize = natural.w - nx;
    if (ny + newSize > natural.h) newSize = natural.h - ny;
    if (newSize < MIN) return;
    setCrop({ x: nx, y: ny, size: newSize });
  }

  function confirm() {
    if (!crop || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.drawImage(
      imgRef.current,
      crop.x,
      crop.y,
      crop.size,
      crop.size,
      0,
      0,
      outputSize,
      outputSize,
    );
    keyOutBackground(ctx, outputSize, outputSize);
    onConfirm(canvas.toDataURL('image/png'));
  }

  const scaleD = natural && display.w ? display.w / natural.w : 1;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h3 className="text-base font-semibold text-gray-900">Ajusta tu logo</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Arrastra el cuadrado para encuadrar. El fondo blanco se hace
            transparente automáticamente para que no salga el cuadro blanco
            en Apple Wallet.
          </p>
        </header>

        <div className="flex items-start gap-4">
          <div
            className="relative inline-block overflow-hidden rounded-lg bg-gray-100"
            style={{ touchAction: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="logo"
              onLoad={init}
              draggable={false}
              className="block max-h-[320px] max-w-full select-none"
              style={{ touchAction: 'none' }}
            />
            {crop && natural && display.w > 0 && (
              <div
                onPointerDown={(e) => startDrag('move', e)}
                className="absolute cursor-move"
                style={{
                  left: crop.x * scaleD,
                  top: crop.y * scaleD,
                  width: crop.size * scaleD,
                  height: crop.size * scaleD,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  outline: '2px solid #fff',
                  touchAction: 'none',
                }}
              >
                {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
                  <div
                    key={k}
                    onPointerDown={(e) => startDrag(k, e)}
                    className="absolute h-4 w-4 rounded-sm border border-gray-400 bg-white"
                    style={{
                      left: k.includes('l') ? -8 : 'auto',
                      right: k.includes('r') ? -8 : 'auto',
                      top: k.includes('t') ? -8 : 'auto',
                      bottom: k.includes('b') ? -8 : 'auto',
                      cursor: HANDLE_CURSOR[k],
                      touchAction: 'none',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Preview</p>
            <div
              className="rounded-lg p-2 ring-1 ring-gray-200"
              style={{
                backgroundImage:
                  'conic-gradient(#e5e7eb 25%, #ffffff 0 50%, #e5e7eb 0 75%, #ffffff 0)',
                backgroundSize: '12px 12px',
              }}
              title="El cuadrado a cuadros = fondo transparente"
            >
              <canvas
                ref={previewRef}
                width={outputSize}
                height={outputSize}
                style={{ width: 60, height: 60, imageRendering: 'auto' }}
              />
            </div>
            <p className="text-[10px] text-gray-400">{outputSize}×{outputSize} px</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Usar este recorte
          </button>
        </div>
      </div>
    </div>
  );
}
