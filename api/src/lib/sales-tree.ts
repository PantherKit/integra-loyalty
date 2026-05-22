/**
 * Árbol de la fuerza de ventas Integra. Cada User Integra-side lleva
 * `createdBy` (userId de quien lo creó); eso forma un árbol cuya raíz es el
 * admin sin createdBy. La visibilidad es por subárbol: un admin ve lo que
 * él y sus descendientes crearon.
 *
 * Funciones puras — operan sobre el set completo de users Integra-side, que
 * es pequeño (decenas), así que construir el árbol en memoria es trivial.
 */

import { User } from './entities';

/** Agrupa users por su createdBy → mapa parentId → hijos. */
function childrenByParent(users: User[]): Map<string, User[]> {
  const map = new Map<string, User[]>();
  for (const u of users) {
    if (!u.createdBy) continue;
    const list = map.get(u.createdBy);
    if (list) list.push(u);
    else map.set(u.createdBy, [u]);
  }
  return map;
}

/**
 * Todos los descendientes de `rootId` (hijos, nietos, …). No incluye al
 * propio root. Recorrido iterativo; tolera ciclos accidentales vía `seen`.
 */
export function descendantsOf(rootId: string, users: User[]): User[] {
  const children = childrenByParent(users);
  const out: User[] = [];
  const seen = new Set<string>([rootId]);
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length > 0) {
    const u = stack.pop()!;
    if (seen.has(u.userId)) continue;
    seen.add(u.userId);
    out.push(u);
    stack.push(...(children.get(u.userId) ?? []));
  }
  return out;
}

/**
 * Set de userIds visibles para `rootId`: él mismo + todos sus descendientes.
 * Es el conjunto que un admin puede listar / consultar.
 */
export function subtreeIds(rootId: string, users: User[]): Set<string> {
  const ids = new Set<string>([rootId]);
  for (const d of descendantsOf(rootId, users)) ids.add(d.userId);
  return ids;
}

/** Descendientes de un rol específico (p. ej. solo los vendedores del subárbol). */
export function descendantsOfRole(
  rootId: string,
  users: User[],
  role: User['role']
): User[] {
  return descendantsOf(rootId, users).filter((u) => u.role === role);
}
