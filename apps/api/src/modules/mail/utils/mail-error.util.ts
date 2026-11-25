const knownCodes = new Set([
  'EAUTH',
  'ECONNECTION',
  'ECONNREFUSED',
  'ECONNRESET',
  'EDNS',
  'EENVELOPE',
  'EHOSTUNREACH',
  'EMESSAGE',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPROTOCOL',
  'ERECIPIENT',
  'ESOCKET',
  'ETIMEDOUT',
  'ETLS',
  'ETRANSPORT',
]);
const knownCommands = new Set([
  'API',
  'AUTH',
  'AUTH LOGIN',
  'AUTH PLAIN',
  'AUTH XOAUTH2',
  'CONN',
  'DATA',
  'EHLO',
  'HELO',
  'MAIL FROM',
  'RCPT TO',
  'STARTTLS',
]);

export function mailErrorMetadata(error: unknown): {
  code?: string;
  command?: string;
  responseCode?: number;
} {
  if (!(error instanceof Error)) return {};
  const record = error as Error & Record<string, unknown>;
  const { code, command, responseCode } = record;
  return {
    ...(typeof code === 'string' && knownCodes.has(code) ? { code } : {}),
    ...(typeof command === 'string' && knownCommands.has(command) ? { command } : {}),
    ...(typeof responseCode === 'number' &&
    Number.isInteger(responseCode) &&
    responseCode >= 100 &&
    responseCode <= 599
      ? { responseCode }
      : {}),
  };
}

export function mailErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown mail provider error.';
  const metadata = Object.entries(mailErrorMetadata(error)).map(
    ([field, value]) => field + '=' + String(value),
  );
  return ['Mail operation error', ...metadata].join(' ');
}
