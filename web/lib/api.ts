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
