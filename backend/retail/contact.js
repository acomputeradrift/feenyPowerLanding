export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhone(value) {
  if (typeof value !== 'string') return false;
  const digits = value.match(/\d/g);
  return !!digits && digits.length >= 7 && digits.length <= 15;
}
