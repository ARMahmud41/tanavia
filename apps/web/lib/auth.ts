// ============================================
// TANAVIA — Auth Helpers
// ============================================

import { api } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

const TOKEN_KEY = 'tanavia_access_token';
const USER_KEY = 'tanavia_user';

/**
 * Set role cookie for middleware (Edge runtime).
 * This is NOT authentication — only used for routing.
 */
export function setRoleCookie(role: string): void {
  if (typeof document === 'undefined') return;
  // 7 days expiry
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `tanavia_role=${role}; expires=${expires}; path=/; SameSite=Lax`;
}

export function clearRoleCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'tanavia_role=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function login(email: string, password: string): Promise<User> {
  const res = await api.post<AuthResponse>('/api/auth/login', {
    email,
    password,
  });

  if (!res.data) throw new Error('Login failed');

  setToken(res.data.accessToken);
  setCurrentUser(res.data.user);
  setRoleCookie(res.data.user.role);
  return res.data.user;
}

export async function register(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<User> {
  const res = await api.post<AuthResponse>('/api/auth/register', input);

  if (!res.data) throw new Error('Registration failed');

  setToken(res.data.accessToken);
  setCurrentUser(res.data.user);
  setRoleCookie(res.data.user.role);
  return res.data.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout', {}, { token: getToken() || undefined });
  } catch {
    // ignore
  }
  clearToken();
  clearRoleCookie();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function isAdmin(): boolean {
  const u = getCurrentUser();
  return u?.role === 'ADMIN';
}

export function isStaff(): boolean {
  const u = getCurrentUser();
  return u?.role === 'STAFF' || u?.role === 'ADMIN';
}