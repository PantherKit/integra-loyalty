import { describe, it, expect } from 'vitest';
import { descendantsOf, subtreeIds, descendantsOfRole } from './sales-tree';
import { User } from './entities';

/**
 * Árbol de prueba:
 *   raiz (admin, createdBy: null)
 *     ├── adminB (admin, createdBy: raiz)
 *     │     ├── repB1 (sales_rep, createdBy: adminB)
 *     │     └── repB2 (sales_rep, createdBy: adminB)
 *     └── repR1 (sales_rep, createdBy: raiz)
 */
function u(userId: string, role: User['role'], createdBy: string | null): User {
  return {
    type: 'USER',
    tenantId: 'INTEGRA',
    userId,
    email: `${userId}@i.local`,
    role,
    cognitoSub: userId,
    createdBy,
    createdAt: '2026-05-21T00:00:00.000Z',
    lastLoginAt: null,
  };
}

const users: User[] = [
  u('raiz', 'integra_admin', null),
  u('adminB', 'integra_admin', 'raiz'),
  u('repB1', 'sales_rep', 'adminB'),
  u('repB2', 'sales_rep', 'adminB'),
  u('repR1', 'sales_rep', 'raiz'),
];

describe('descendantsOf', () => {
  it('raiz ve todo el árbol', () => {
    const ids = descendantsOf('raiz', users).map((x) => x.userId).sort();
    expect(ids).toEqual(['adminB', 'repB1', 'repB2', 'repR1']);
  });

  it('adminB ve solo su subárbol', () => {
    const ids = descendantsOf('adminB', users).map((x) => x.userId).sort();
    expect(ids).toEqual(['repB1', 'repB2']);
  });

  it('un vendedor hoja no tiene descendientes', () => {
    expect(descendantsOf('repB1', users)).toEqual([]);
  });
});

describe('subtreeIds', () => {
  it('incluye al propio root + descendientes', () => {
    expect([...subtreeIds('adminB', users)].sort()).toEqual(['adminB', 'repB1', 'repB2']);
  });
});

describe('descendantsOfRole', () => {
  it('raiz: solo los vendedores del árbol', () => {
    const ids = descendantsOfRole('raiz', users, 'sales_rep').map((x) => x.userId).sort();
    expect(ids).toEqual(['repB1', 'repB2', 'repR1']);
  });

  it('adminB: solo sus vendedores', () => {
    const ids = descendantsOfRole('adminB', users, 'sales_rep').map((x) => x.userId).sort();
    expect(ids).toEqual(['repB1', 'repB2']);
  });
});
