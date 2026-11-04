export function mailErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown mail provider error.';
  const record = error as Error & Record<string, unknown>;
  const metadata = ['code', 'command', 'responseCode', 'syscall', 'hostname']
    .map((key) => {
      const value = record[key];
      return typeof value === 'string' || typeof value === 'number'
        ? key + '=' + String(value)
        : null;
    })
    .filter((value): value is string => value !== null);
  return [error.name, ...metadata].join(' ');
}
