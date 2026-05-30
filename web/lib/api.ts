'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://tcsbnd5m3l.execute-api.us-east-1.amazonaws.com';
const TOKEN_KEY = 'integra_id_token';

/** URL del Apple Wallet .pkpass firmado para una card. */
export function pkpassUrl(cardId: string): string {
  return `${API_URL}/cards/${encodeURIComponent(cardId)}/pkpass`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  status: number;
  body: unknown;
}

// Cuando NEXT_PUBLIC_API_URL apunta a localhost (modo dev local) y hay un
// rol guardado por /dev page, mandamos x-tenant-id / x-user-id que la API
// local acepta vía ALLOW_HEADER_AUTH=true. En prod (API_URL en AWS) NO se
// inyectan estos headers, así el flujo normal de Cognito sigue intacto.
const DEV_TENANT_KEY = 'integra_dev_tenant_id';
const DEV_USER_KEY = 'integra_dev_user_id';
const DEV_ROLE_KEY = 'integra_dev_role';
const DEV_EMAIL_KEY = 'integra_dev_email';

function getDevHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  if (!API_URL.includes('localhost')) return {};
  const tenant = window.localStorage.getItem(DEV_TENANT_KEY);
  const userId = window.localStorage.getItem(DEV_USER_KEY);
  if (!tenant || !userId) return {};
  return { 'x-tenant-id': tenant, 'x-user-id': userId };
}

export function setDevRole(tenantId: string, userId: string, role: string, email: string) {
  window.localStorage.setItem(DEV_TENANT_KEY, tenantId);
  window.localStorage.setItem(DEV_USER_KEY, userId);
  window.localStorage.setItem(DEV_ROLE_KEY, role);
  window.localStorage.setItem(DEV_EMAIL_KEY, email);
}

export function clearDevRole() {
  window.localStorage.removeItem(DEV_TENANT_KEY);
  window.localStorage.removeItem(DEV_USER_KEY);
  window.localStorage.removeItem(DEV_ROLE_KEY);
  window.localStorage.removeItem(DEV_EMAIL_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getDevHeaders(),
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!res.ok) {
    const err: ApiError = { status: res.status, body };
    throw err;
  }
  return body as T;
}

// Auth
export interface AuthResult {
  tenant: { tenantId: string; plan: string };
  merchant: { name: string; industry: string };
  user: { userId: string; email: string; role: string };
  tokens: { idToken: string; accessToken: string; refreshToken: string; expiresIn: number };
}

export async function signup(input: {
  email: string; password: string; merchantName: string; industry: string;
}): Promise<AuthResult> {
  const res = await request<AuthResult>('/auth/signup', { method: 'POST', body: JSON.stringify(input) });
  setToken(res.tokens.idToken);
  return res;
}

export async function login(input: { email: string; password: string }): Promise<{ tokens: AuthResult['tokens']; claims: any }> {
  const res = await request<{ tokens: AuthResult['tokens']; claims: any }>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  setToken(res.tokens.idToken);
  return res;
}

export async function getMe(): Promise<{ claims: { sub: string; email: string; tenantId: string; role: string } }> {
  return request('/auth/me');
}

// Estilo del sello del grid de la strip (mismos valores que el backend).
export type StampStyle = 'logo' | 'disc' | 'star' | 'heart' | 'cup' | 'check';

// Merchants
export interface Merchant {
  tenantId: string;
  slug: string;
  name: string;
  industry: string;
  brandColor?: string;
  logoUrl?: string;
  stampStyle?: StampStyle;
  phone?: string;
}

export async function getMyMerchant(): Promise<Merchant> {
  return request<Merchant>('/merchants/me');
}

export async function updateMyMerchant(input: Partial<Merchant>): Promise<Merchant> {
  return request<Merchant>('/merchants/me', { method: 'PATCH', body: JSON.stringify(input) });
}

// Programs
export interface LoyaltyProgram {
  tenantId: string;
  programId: string;
  name: string;
  description?: string;
  stampsRequired: number;
  rewardType: 'free_item' | 'discount_percent' | 'discount_amount' | 'custom';
  rewardDetail: string;
  status: 'active' | 'paused' | 'archived';
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  stampsRequired: number;
  rewardType: LoyaltyProgram['rewardType'];
  rewardDetail: string;
}

export async function createProgram(input: CreateProgramInput): Promise<LoyaltyProgram> {
  return request<LoyaltyProgram>('/programs', { method: 'POST', body: JSON.stringify(input) });
}

export async function listMyPrograms(): Promise<{ items: LoyaltyProgram[] }> {
  return request<{ items: LoyaltyProgram[] }>('/programs/me');
}

// Public (sin auth) — landing del merchant + customer signup + card lookup
export interface PublicMerchant {
  merchant: { slug: string; name: string; industry: string; brandColor?: string; logoUrl?: string; stampStyle?: StampStyle };
  program: { programId: string; name: string; description?: string; stampsRequired: number; rewardDetail: string } | null;
}

export async function getPublicMerchant(slug: string): Promise<PublicMerchant> {
  return request<PublicMerchant>(`/m/${encodeURIComponent(slug)}`);
}

export interface Customer { tenantId: string; customerId: string; phone: string; firstName?: string; email?: string; }
export interface Card {
  cardId: string;
  programId: string;
  stamps: number;
  redemptionsCount: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  // Solo presentes en endpoints autenticados del comercio (no en GET /cards/:id público).
  tenantId?: string;
  customerId?: string;
  customerPhone?: string;
}

export async function signupCustomerToMerchant(slug: string, input: { phone: string; firstName?: string; email?: string; programId?: string; }): Promise<{ customer: Customer; card: Card; program: LoyaltyProgram }> {
  return request(`/m/${encodeURIComponent(slug)}/customers`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getCard(cardId: string): Promise<Card> {
  return request<Card>(`/cards/${encodeURIComponent(cardId)}`);
}

// Slice 3 — stamps + redeem + activity (merchant auth)

export interface Transaction {
  type: 'TRANSACTION';
  tenantId: string;
  transactionId: string;
  kind: 'stamp' | 'redeem';
  cardId: string;
  customerId: string;
  customerPhone: string;
  programId: string;
  programName: string;
  amount: number;
  stampsBefore: number;
  stampsAfter: number;
  note?: string;
  performedByUserId: string;
  createdAt: string;
}

export async function lookupCardsByPhone(phone: string): Promise<{ items: Card[] }> {
  return request<{ items: Card[] }>(`/cards/lookup?phone=${encodeURIComponent(phone)}`);
}

export async function stampCard(cardId: string, amount = 1, note?: string): Promise<{ card: Card; transaction: Transaction }> {
  return request(`/cards/${encodeURIComponent(cardId)}/stamp`, {
    method: 'POST',
    body: JSON.stringify({ amount, note }),
  });
}

export async function redeemCardApi(cardId: string, note?: string): Promise<{ card: Card; transaction: Transaction }> {
  return request(`/cards/${encodeURIComponent(cardId)}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function getActivity(limit = 20): Promise<{ items: Transaction[] }> {
  return request<{ items: Transaction[] }>(`/activity?limit=${limit}`);
}

// Dashboard — recomendaciones AI

export type DashboardSignalType = 'churn_at_risk' | 'slow_day' | 'stale_redemption';
export type DashboardCtaKind = 'navigate' | 'whatsapp' | 'dismiss';
export type DashboardKpiId =
  | 'clientes_activos'
  | 'sellos_otorgados'
  | 'premios_canjeados'
  | 'programa_activo';

export interface DashboardRecommendation {
  id: string;
  signal_type: DashboardSignalType;
  copy: string;
  cta_label: string;
  cta_kind: DashboardCtaKind;
  cta_target?: string;
  evidence?: Record<string, unknown>;
}

export interface DashboardKpiExplanation {
  kpi_id: DashboardKpiId;
  text: string;
}

export interface DashboardRecommendationsResponse {
  recommendations: DashboardRecommendation[];
  kpi_explanations: DashboardKpiExplanation[];
}

export async function getDashboardRecommendations(): Promise<DashboardRecommendationsResponse> {
  return request<DashboardRecommendationsResponse>('/dashboard/recommendations');
}

// Billing — suscripción Stripe (prueba 14 días + paywall)

export type BillingPlan = 'basico' | 'pro' | 'multi';

export interface BillingStatus {
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';
  trialEndsAt: string | null;
  plan: BillingPlan | null;
  currentPeriodEnd: string | null;
  active: boolean;
  reason: string;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  return request<BillingStatus>('/billing/status');
}

/** Crea la Checkout Session y redirige el browser a Stripe. */
export async function startCheckout(plan: BillingPlan): Promise<void> {
  const { url } = await request<{ url: string }>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
  window.location.href = url;
}

/** true si el error de la API es un 402 subscription_required (paywall). */
export function isSubscriptionRequired(e: unknown): boolean {
  const err = e as { status?: number; body?: { error?: string } };
  return err?.status === 402 && err?.body?.error === 'subscription_required';
}

// ============================================================================
// Sales Org — fuerza de ventas Integra (tickets 02/03)
// ============================================================================

export interface SalesRep {
  userId: string;
  email: string;
  salesAdminId?: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SalesRepKpi {
  repId: string;
  repEmail: string;
  merchantsCount: number;
  cardsIssuedCount: number;
  cardsActiveCount: number;
  mrrMxn: number;
  churnRiskCount: number;
}

export interface SalesAdminKpi {
  adminId: string;
  adminEmail: string;
  repsCount: number;
  merchantsCount: number;
  cardsIssuedCount: number;
  mrrMxn: number;
}

export interface SalesMerchantKpi {
  merchantId: string;
  name: string;
  status: string;
  subscriptionStatus?: string;
  cardsCount: number;
  mrrMxn: number;
  lastActivityAt: string | null;
}

export type KpiWindow = '7d' | '30d' | '90d' | 'all';

export async function listSalesReps(adminId?: string): Promise<{ reps: SalesRep[] }> {
  const qs = adminId ? `?adminId=${encodeURIComponent(adminId)}` : '';
  return request(`/admin/sales/reps${qs}`);
}

export async function getSalesRep(repId: string): Promise<SalesRep> {
  return request(`/admin/sales/reps/${encodeURIComponent(repId)}`);
}

export async function createSalesRep(input: {
  email: string;
  salesAdminId?: string;
}): Promise<{ rep: SalesRep; tempPassword: string }> {
  return request(`/admin/sales/reps`, { method: 'POST', body: JSON.stringify(input) });
}

export interface SalesAdmin {
  userId: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function listSalesAdmins(): Promise<{ admins: SalesAdmin[] }> {
  return request(`/admin/sales/admins`);
}

export async function createSalesAdmin(input: {
  email: string;
}): Promise<{ admin: { userId: string; email: string }; tempPassword: string }> {
  return request(`/admin/sales/admins`, { method: 'POST', body: JSON.stringify(input) });
}

/** Extrae el mensaje más útil de un error de la API (hint > error > genérico). */
export function apiErrorMessage(e: unknown, fallback = 'Ocurrió un error'): string {
  const err = e as { body?: { hint?: string; error?: string } };
  return err?.body?.hint ?? err?.body?.error ?? fallback;
}

export async function listSalesMerchants(params: { repId?: string; adminId?: string } = {}): Promise<{
  merchants: Array<{ tenantId: string; name: string; slug: string; salesRepId?: string | null }>;
}> {
  const qs = new URLSearchParams();
  if (params.repId) qs.set('repId', params.repId);
  if (params.adminId) qs.set('adminId', params.adminId);
  const tail = qs.toString();
  return request(`/admin/sales/merchants${tail ? '?' + tail : ''}`);
}

export async function assignMerchantRep(
  merchantId: string,
  salesRepId: string | null
): Promise<{ merchant: { tenantId: string; salesRepId: string | null } }> {
  return request(`/admin/sales/merchants/${encodeURIComponent(merchantId)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ salesRepId }),
  });
}

export async function getKpisReps(opts: { window?: KpiWindow; adminId?: string } = {}): Promise<{
  window: KpiWindow;
  reps: SalesRepKpi[];
}> {
  const qs = new URLSearchParams();
  if (opts.window) qs.set('window', opts.window);
  if (opts.adminId) qs.set('adminId', opts.adminId);
  const tail = qs.toString();
  return request(`/admin/sales/kpis/reps${tail ? '?' + tail : ''}`);
}

export async function getKpisAdmins(): Promise<{ admins: SalesAdminKpi[] }> {
  return request(`/admin/sales/kpis/admins`);
}

export async function getKpisMe(window?: KpiWindow): Promise<SalesAdminKpi | SalesRepKpi> {
  const qs = window ? `?window=${window}` : '';
  return request(`/admin/sales/kpis/me${qs}`);
}

export async function getKpisMerchantsByRep(repId: string): Promise<{
  repId: string;
  merchants: SalesMerchantKpi[];
}> {
  return request(`/admin/sales/kpis/merchants/${encodeURIComponent(repId)}`);
}

export interface SalesMerchant {
  tenantId: string;
  name: string;
  slug: string;
  salesRepId?: string | null;
}

export async function createSalesMerchant(input: {
  merchantName: string;
  industry: string;
  ownerEmail: string;
  salesRepId?: string;
}): Promise<{
  tenant: { tenantId: string; slug: string };
  merchant: SalesMerchant;
  owner: { userId: string; email: string };
  tempPassword: string;
}> {
  return request(`/admin/sales/merchants`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Decodifica payload del JWT (NO verifica firma — solo lectura cliente para guards).
 *  En modo dev local (API apuntando a localhost) lee los claims desde localStorage
 *  en lugar del JWT, para no requerir Cognito en local. */
export function decodeJwtClaims(): { sub?: string; email?: string; role?: string } | null {
  // Dev bypass: si estamos en localhost y hay headers dev, sintetizamos los claims.
  if (typeof window !== 'undefined' && API_URL.includes('localhost')) {
    const sub = window.localStorage.getItem(DEV_USER_KEY);
    const role = window.localStorage.getItem(DEV_ROLE_KEY);
    const email = window.localStorage.getItem(DEV_EMAIL_KEY);
    if (sub && role) return { sub, role, email: email ?? undefined };
  }
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      sub: claims.sub as string | undefined,
      email: claims.email as string | undefined,
      role: claims['custom:role'] as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Mapa rol → consola home. Único punto de verdad del routing por rol:
 * lo usan el login (a dónde mandar tras autenticar) y los guards de cada
 * layout (a dónde rebotar a un usuario que llegó a una sección ajena).
 *
 *  - sales_rep                 → /sales/rep
 *  - sales_admin / integra_admin → /sales/admin
 *  - owner / merchant / staff  → /dashboard  (back office del comercio)
 */
export function homeForRole(role?: string): string {
  switch (role) {
    case 'sales_rep':
      return '/sales/rep';
    case 'sales_admin':
    case 'integra_admin':
      return '/sales/admin';
    default:
      return '/dashboard';
  }
}
