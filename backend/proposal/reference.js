import { randomBytes } from 'node:crypto';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateReference(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const bytes = randomBytes(6);
  let suffix = '';
  for (const byte of bytes) {
    suffix += ALPHANUMERIC[byte % ALPHANUMERIC.length];
  }
  return `RTI-${year}${month}${day}-${suffix}`;
}
