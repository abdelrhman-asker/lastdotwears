export function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

export function prismaUniqueTarget(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('meta' in error)) return '';
  const meta = (error as { meta?: unknown }).meta;
  if (typeof meta !== 'object' || meta === null || !('target' in meta)) return '';
  const target = (meta as { target?: unknown }).target;
  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === 'string').join(' ');
  }
  return typeof target === 'string' ? target : '';
}
