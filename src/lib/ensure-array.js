/**
 * Coerce API / query data into a plain array (handles object maps and null).
 */
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'object') return Object.values(value);
  return [];
}
