/**
 * Genera un slug kebab-case a partir de un nombre + sufijo random corto.
 * Ej: "Café Mérida" → "cafe-merida-a7k2"
 */
export function generateSlug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);

  const suffix = randomSuffix(4);
  return base ? `${base}-${suffix}` : `m-${suffix}`;
}

function randomSuffix(len: number): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // sin 0/o/1/l (ambiguous)
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
