import type { UserRole } from '../../users/interfaces/user-record.interface.js';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  email: string;
  role: UserRole;
  type: 'access';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export interface IssuedSessionTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}
