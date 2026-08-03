import type { Request } from 'express';

import type { RequestMetadata } from '../interfaces/auth-token.interface.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readCookie(request: Request, name: string): string | null {
  const cookies: unknown = request.cookies;
  if (!isRecord(cookies)) {
    return null;
  }
  const value = cookies[name];
  return typeof value === 'string' ? value : null;
}

export function requestMetadata(request: Request): RequestMetadata {
  const userAgent = request.headers['user-agent'];
  return {
    ipAddress: request.ip ? request.ip.slice(0, 45) : null,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
  };
}
