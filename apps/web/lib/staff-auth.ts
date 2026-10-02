// ============================================
// TANAVIA — Staff Auth Helpers
// ============================================

import { getCurrentUser, getToken, type User } from './auth';

export function isStaff(): boolean {
  const u = getCurrentUser();
  return (
    u?.role === 'STAFF' || u?.role === 'MANAGER' || u?.role === 'ADMIN'
  );
}

export function isManager(): boolean {
  const u = getCurrentUser();
  return u?.role === 'MANAGER' || u?.role === 'ADMIN';
}

export function getStaffToken(): string | null {
  return getToken();
}

export function getStaffUser(): User | null {
  return getCurrentUser();
}

// Redirect helpers (client-only)
export function redirectIfNotStaff(router: {
  push: (path: string) => void;
}): boolean {
  if (!isStaff()) {
    router.push('/staff/login');
    return false;
  }
  return true;
}