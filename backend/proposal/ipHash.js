import { createHmac } from 'node:crypto';

export function hashClientIp(ip, salt) {
  if (!salt || !ip) return undefined;
  return createHmac('sha256', salt).update(String(ip)).digest('hex');
}
