import type { ID, Timestamps } from './common.js';

export type Role = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';

export interface User extends Timestamps {
  id: ID;
  email: string;
  phone?: string | null;
  name: string;
  role: Role;
  emailVerified: string | null;
  twoFactorOn: boolean;
  lastLoginAt: string | null;
}

export interface Session {
  id: ID;
  userId: ID;
  userAgent: string | null;
  ip: string | null;
  expiresAt: string;
  createdAt: string;
}