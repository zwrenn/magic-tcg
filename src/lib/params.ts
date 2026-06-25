/**
 * Narrows an arbitrary string to one of the allowed values T.
 * Returns `fallback` when the value is not in the valid set.
 */
export function coerceParam<T extends string>(
  value: string,
  valid: readonly T[],
  fallback: T
): T {
  return (valid as readonly string[]).includes(value) ? (value as T) : fallback;
}
