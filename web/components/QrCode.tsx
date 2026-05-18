'use client';

/**
 * Generador de código QR sin dependencias externas.
 * Implementa el subconjunto del estándar QR (ISO/IEC 18004) suficiente para
 * codificar URLs cortas en modo byte con corrección de errores nivel M.
 * Renderiza SVG escalable. No llama a ninguna API externa.
 */

// ---------- Galois Field GF(256) para Reed-Solomon ----------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], 1);
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const d of data) {
    const factor = d ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) {
      for (let i = 0; i < gen.length; i++) res[i] ^= gfMul(gen[i], factor);
    }
  }
  return res;
}

// ---------- Tablas de capacidad (modo byte, nivel de corrección M) ----------
// version -> { totalCodewords, ecPerBlock, blocks: [count, dataCodewords][] }
interface VerSpec {
  version: number;
  ecPerBlock: number;
  group1: [number, number]; // [numBlocks, dataCodewordsPerBlock]
  group2: [number, number];
}

const SPECS_M: VerSpec[] = [
  { version: 1, ecPerBlock: 10, group1: [1, 16], group2: [0, 0] },
  { version: 2, ecPerBlock: 16, group1: [1, 28], group2: [0, 0] },
  { version: 3, ecPerBlock: 26, group1: [1, 44], group2: [0, 0] },
  { version: 4, ecPerBlock: 18, group1: [2, 32], group2: [0, 0] },
  { version: 5, ecPerBlock: 24, group1: [2, 43], group2: [0, 0] },
  { version: 6, ecPerBlock: 16, group1: [4, 27], group2: [0, 0] },
  { version: 7, ecPerBlock: 18, group1: [4, 31], group2: [0, 0] },
  { version: 8, ecPerBlock: 22, group1: [2, 38], group2: [2, 39] },
  { version: 9, ecPerBlock: 22, group1: [3, 36], group2: [2, 37] },
  { version: 10, ecPerBlock: 26, group1: [4, 43], group2: [1, 44] },
];

function dataCapacity(spec: VerSpec): number {
  return spec.group1[0] * spec.group1[1] + spec.group2[0] * spec.group2[1];
}

// ---------- Construcción de bits ----------
function buildBitStream(text: string, spec: VerSpec): number[] {
  const bytes: number[] = [];
  for (const ch of new TextEncoder().encode(text)) bytes.push(ch);

  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  push(0b0100, 4); // modo byte
  // indicador de longitud: 8 bits para versiones 1-9, 16 para 10+
  push(bytes.length, spec.version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);

  const cap = dataCapacity(spec) * 8;
  // terminador
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
  // padding a byte
  while (bits.length % 8 !== 0) bits.push(0);
  // bytes de relleno alternados
  const pad = [0xec, 0x11];
  let pi = 0;
  while (bits.length < cap) {
    push(pad[pi++ % 2], 8);
  }

  // a codewords
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    codewords.push(v);
  }
  return codewords;
}

function interleave(codewords: number[], spec: VerSpec): number[] {
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;
  const groups: [number, number][] = [spec.group1, spec.group2];
  for (const [count, size] of groups) {
    for (let b = 0; b < count; b++) {
      const data = codewords.slice(offset, offset + size);
      offset += size;
      blocks.push({ data, ec: rsEncode(data, spec.ecPerBlock) });
    }
  }
  const result: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const blk of blocks) if (i < blk.data.length) result.push(blk.data[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const blk of blocks) result.push(blk.ec[i]);
  }
  return result;
}

// ---------- Matriz ----------
function chooseSpec(text: string): VerSpec {
  const len = new TextEncoder().encode(text).length;
  for (const spec of SPECS_M) {
    const headerBytes = spec.version <= 9 ? 2 : 3; // aprox: 4 bits modo + 8/16 long ~ 2/3 bytes
    if (len + headerBytes <= dataCapacity(spec)) return spec;
  }
  return SPECS_M[SPECS_M.length - 1];
}

function buildMatrix(text: string): { size: number; modules: boolean[][] } {
  const spec = chooseSpec(text);
  const version = spec.version;
  const size = version * 4 + 17;
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );

  const setFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inRing =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6));
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        modules[rr][cc] = inRing || inCore;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // separadores ya quedan como false por el bucle -1..7

  // timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (modules[6][i] === null) modules[6][i] = i % 2 === 0;
    if (modules[i][6] === null) modules[i][6] = i % 2 === 0;
  }

  // alignment pattern (versiones 2-10 tienen uno en centro)
  if (version >= 2) {
    const pos = size - 7;
    const place = (cr: number, cc: number) => {
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const rr = cr + r;
          const cc2 = cc + c;
          if (modules[rr][cc2] !== null) continue;
          modules[rr][cc2] =
            Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    };
    place(pos, pos);
  }

  // dark module
  modules[size - 8][8] = true;

  // reservar áreas de info de formato
  const reserveFormat = () => {
    for (let i = 0; i < 9; i++) {
      if (modules[8][i] === null) modules[8][i] = false;
      if (modules[i][8] === null) modules[i][8] = false;
    }
    for (let i = 0; i < 8; i++) {
      if (modules[8][size - 1 - i] === null) modules[8][size - 1 - i] = false;
      if (modules[size - 1 - i][8] === null) modules[size - 1 - i][8] = false;
    }
  };
  reserveFormat();

  // datos
  const data = interleave(buildBitStream(text, spec), spec);
  const bitAt = (idx: number) => (data[idx >> 3] >> (7 - (idx & 7))) & 1;
  let bitIdx = 0;
  const totalBits = data.length * 8;

  let dir = -1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5; // saltar columna de timing
    for (let i = 0; i < size; i++) {
      const row = dir < 0 ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (modules[row][cc] !== null) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          bit = bitAt(bitIdx);
          bitIdx++;
        }
        // máscara 0: (row + col) % 2 === 0
        if ((row + cc) % 2 === 0) bit ^= 1;
        modules[row][cc] = bit === 1;
      }
    }
    dir = -dir;
  }

  // info de formato: nivel M (00) + máscara 0 -> bits con BCH
  // valor precomputado para EC=M(00) máscara=000: 0b101010000010010
  const formatBits = 0b101010000010010;
  const fmt = (i: number) => ((formatBits >> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) modules[8][i] = fmt(i);
  modules[8][7] = fmt(6);
  modules[8][8] = fmt(7);
  modules[7][8] = fmt(8);
  for (let i = 9; i < 15; i++) modules[14 - i][8] = fmt(i);
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = fmt(i);
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = fmt(i);

  const final: boolean[][] = modules.map((r) => r.map((v) => v === true));
  return { size, modules: final };
}

export interface QrCodeProps {
  value: string;
  /** Tamaño en píxeles del lado del SVG. */
  size?: number;
  className?: string;
  /** Color de los módulos oscuros. */
  fg?: string;
  bg?: string;
}

export default function QrCode({
  value,
  size = 220,
  className,
  fg = '#111827',
  bg = '#ffffff',
}: QrCodeProps) {
  let matrix: { size: number; modules: boolean[][] };
  try {
    matrix = buildMatrix(value);
  } catch {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label="No se pudo generar el código QR"
      />
    );
  }

  const quiet = 4;
  const dim = matrix.size + quiet * 2;
  const rects: string[] = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.modules[r][c]) {
        rects.push(`M${c + quiet} ${r + quiet}h1v1h-1z`);
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Código QR para ${value}`}
    >
      <rect width={dim} height={dim} fill={bg} />
      <path d={rects.join('')} fill={fg} />
    </svg>
  );
}
