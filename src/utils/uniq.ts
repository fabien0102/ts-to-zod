/**
 * Creates a duplicate-free version of an array.
 *
 * @param arr
 * @returns
 */
export function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
