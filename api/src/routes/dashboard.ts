import { Hono } from 'hono';
import { requireTenant } from '../middleware/tenant';
import { computeRecommendations } from '../lib/recommendations';

/**
 * Sub-rutas del dashboard del merchant que no encajan en un dominio existente
 * (programas, actividad, cards). Hoy solo GET /recommendations.
 *
 * Está protegido con requireTenant — sin merchantId el endpoint no responde.
 */
export const dashboard = new Hono();

dashboard.get('/recommendations', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  try {
    const payload = await computeRecommendations(tenantId);
    return c.json(payload);
  } catch (err) {
    // Defensa adicional: el módulo ya hace fail-closed internamente, pero
    // si algo lanzara desde un repo (timeout DDB, etc.) preferimos devolver
    // payload vacío que romper el dashboard. Log para observabilidad.
    console.warn('[dashboard/recommendations] unhandled error:', err);
    return c.json({ recommendations: [], kpi_explanations: [] });
  }
});
