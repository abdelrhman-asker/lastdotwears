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

export function mailErrorDetails(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown mail provider error.';
  const record = error as Error & Record<string, unknown>;
  const { code, command, responseCode } = record;
  const metadata: string[] = [];
  if (typeof code === 'string' && knownCodes.has(code)) metadata.push('code=' + code);
  if (typeof command === 'string' && knownCommands.has(command))
    metadata.push('command=' + command);
  if (
    typeof responseCode === 'number' &&
    Number.isInteger(responseCode) &&
    responseCode >= 100 &&
    responseCode <= 599
  ) {
    metadata.push('responseCode=' + String(responseCode));
  }
  return ['Mail operation error', ...metadata].join(' ');
}
