/**
 * Run the first item alone, then the rest together.
 *
 * Child tools such as `deno bundle` install a shared binary lazily on their
 * first use. Started together on a cold cache, several children race to place
 * that binary and all but one can fail. Letting one finish first installs it
 * once; the remaining items then run concurrently against the warm cache.
 * Results keep the input order. A failure of the first item starts no others.
 */
export async function warmThenAll<T, R>(
  items: readonly T[],
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const [first, ...rest] = items;
  if (first === undefined) return [];
  const head = await run(first);
  return [head, ...await Promise.all(rest.map(run))];
}
