'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://tcsbnd5m3l.execute-api.us-east-1.amazonaws.com';
const TOKEN_KEY = 'integra_id_token';

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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

// Merchants
export interface Merchant {
  tenantId: string;
  slug: string;
  name: string;
  industry: string;
  brandColor?: string;
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
  merchant: { slug: string; name: string; industry: string; brandColor?: string };
  program: { programId: string; name: string; description?: string; stampsRequired: number; rewardDetail: string } | null;
}

export async function getPublicMerchant(slug: string): Promise<PublicMerchant> {
  return request<PublicMerchant>(`/m/${encodeURIComponent(slug)}`);
}

export interface Customer { tenantId: string; customerId: string; phone: string; firstName?: string; email?: string; }
export interface Card {
  tenantId: string;
  cardId: string;
  programId: string;
  customerId: string;
  customerPhone: string;
  stamps: number;
  redemptionsCount: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
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
