export function mailErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown mail provider error.';
  const record = error as Error & Record<string, unknown>;
  const metadata = ['code', 'command', 'responseCode', 'syscall']
    .map((key) => {
      const value = record[key];
      if (typeof value === 'number' && Number.isInteger(value)) return key + '=' + String(value);
      if (typeof value !== 'string') return null;
      const pattern = key === 'command' ? /^[A-Z]+(?: [A-Z]+)?$/u : /^[A-Za-z0-9_]+$/u;
      return value.length <= 32 && pattern.test(value) ? key + '=' + value : null;
    })
    .filter((value): value is string => value !== null);
  return ['Mail operation error', ...metadata].join(' ');
}
